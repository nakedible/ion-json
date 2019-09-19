const {
  makeReader,
  makeTextWriter,
  makePrettyWriter,
  makeBinaryWriter,
  IonTypes,
  Decimal,
  Timestamp
} = require("ion-js");
// XXX: const { cloneDeepWith } = require('lodash/cloneDeepWith');

function readValueRaw(reader) {
  switch (reader.type()) {
    case IonTypes.NULL:
      return null;
    case IonTypes.BOOL:
      if (reader.isNull()) return { __ion: "null", value: "bool" };
      return reader.booleanValue();
    case IonTypes.INT:
      if (reader.isNull()) return { __ion: "null", value: "int" };
      //console.log(reader._parser.get_value_as_string(reader._parser._curr));
      const int = reader.numberValue();
      if (int < Number.MIN_SAFE_INTEGER || int > Number.MAX_SAFE_INTEGER)
        throw new Error("integer too large to be JavaScript number");
      return { __ion: "int", value: int.toString() };
    case IonTypes.FLOAT:
      if (reader.isNull()) return { __ion: "null", value: "float" };
      const float = reader.numberValue();
      if (Object.is(float, NaN)) return { __ion: "float", value: "nan" };
      if (Object.is(float, Infinity)) return { __ion: "float", value: "+inf" };
      if (Object.is(float, -Infinity)) return { __ion: "float", value: "-inf" };
      if (Object.is(float, -0)) return { __ion: "float", value: "-0" };
      return float;
    case IonTypes.DECIMAL:
      if (reader.isNull()) return { __ion: "null", value: "decimal" };
      // XXX: uses internal representations of ion-js
      const decimal = reader.decimalValue();
      return {
        __ion: "decimal",
        exp: decimal._exponent.toString(),
        coef: decimal._coefficient.toString()
      };
    case IonTypes.TIMESTAMP:
      if (reader.isNull()) return { __ion: "null", value: "timestamp" };
      return { __ion: "timestamp", value: reader.timestampValue().toString() };
    case IonTypes.STRING:
      if (reader.isNull()) return { __ion: "null", value: "string" };
      return reader.stringValue();
    case IonTypes.SYMBOL:
      if (reader.isNull()) return { __ion: "null", value: "symbol" };
      return { __ion: "symbol", value: reader.stringValue() };
    case IonTypes.BLOB:
      if (reader.isNull()) return { __ion: "null", value: "blob" };
      return {
        __ion: "blob",
        value: Buffer.from(reader.byteValue()).toString("base64")
      };
    case IonTypes.CLOB:
      if (reader.isNull()) return { __ion: "null", value: "clob" };
      return {
        __ion: "clob",
        value: Buffer.from(reader.byteValue()).toString("base64")
      };
    case IonTypes.STRUCT:
      if (reader.isNull()) return { __ion: "null", value: "struct" };
      const struct = {};
      reader.stepIn();
      while (reader.next() !== null) {
        const field = reader.fieldName();
        const esc = `__ion:${field}`;
        if (struct.hasOwnProperty(esc)) {
          struct[esc].push(readValue(reader));
        } else if (field === "__ion" || field.startsWith('ion:') || struct.hasOwnProperty(field)) {
          struct[esc] = [readValue(reader)];
        } else {
          struct[field] = readValue(reader);
        }
      }
      reader.stepOut();
      return struct;
    case IonTypes.LIST:
      if (reader.isNull()) return { __ion: "null", value: "list" };
      const list = [];
      reader.stepIn();
      while (reader.next() !== null) {
        list.push(readValue(reader));
      }
      reader.stepOut();
      return list;
    case IonTypes.SEXP:
      if (reader.isNull()) return { __ion: "null", value: "sexp" };
      const sexp = [];
      reader.stepIn();
      while (reader.next() !== null) {
        sexp.push(readValue(reader));
      }
      reader.stepOut();
      return { __ion: "sexp", value: sexp };
    default:
      throw new Error("internal error");
  }
}

function readValue(reader) {
  const annotations = reader.annotations();
  if (annotations.length) {
    return { __ion: "annotation", annotations, value: readValueRaw(reader) };
  } else {
    return readValueRaw(reader);
  }
}

function ionToJson(buf) {
  const reader = makeReader(buf);
  reader.next();
  return readValue(reader);
}

function writeValue(writer, value) {
  if (typeof value === "boolean") {
    writer.writeBoolean(value);
  } else if (typeof value === "number") {
    writer.writeFloat64(value);
  } else if (typeof value === "string") {
    writer.writeString(value);
  } else if (value === null) {
    writer.writeNull(IonTypes.NULL);
  } else if (Array.isArray(value)) {
    writer.stepIn(IonTypes.LIST);
    for (const item of value.value) {
      writeValue(writer, item);
    }
    writer.stepOut();
  } else if (value.__ion === "null") {
    if (value.value === "int") writer.writeNull(IonTypes.INT);
  } else if (value.__ion === "int") {
    writer.writeInt(value.value);
  } else if (value.__ion === "float") {
    if (value.value === "nan") writer.writeFloat64(NaN);
    // XXX: nan is buggy in ion writer
    else if (value.value === "+inf") writer.writeFloat64(Infinity);
    else if (value.value === "-inf") writer.writeFloat64(-Infinity);
    else if (value.value === "-0") writer.writeFloat64(-0);
  } else if (value.__ion === "decimal") {
    writer.writeDecimal(Decimal.parse(`${value.coef}d${value.exp}`));
  } else if (value.__ion === "timestamp") {
    writer.writeTimestamp(Timestamp.parse(value.value));
  } else if (value.__ion === "symbol") {
    writer.writeSymbol(value.value);
  } else if (value.__ion === "blob") {
    writer.writeBlob(Buffer.from(value.value, "base64"));
  } else if (value.__ion === "clob") {
    writer.writeClob(Buffer.from(value.value, "base64"));
  } else if (value.__ion === "sexp") {
    writer.stepIn(IonTypes.SEXP);
    for (const item of value.value) {
      writeValue(writer, item);
    }
    writer.stepOut();
  } else if (value.__ion === "annotation") {
    writer.setAnnotations(value.annotations);
    writeValue(writer, value.value);
  } else {
    writer.stepIn(IonTypes.STRUCT);
    for (const key in value) {
      if (key.startsWith("__ion:")) {
        for (const val of value[key]) {
          writer.writeFieldName(key.substr(6));
          writeValue(writer, val);
        }
      } else {
        writer.writeFieldName(key);
        writeValue(writer, value[key]);
      }
    }
    writer.stepOut();
  }
}

function jsonToIonText(value) {
  const writer = makeTextWriter();
  writeValue(writer, value);
  writer.close();
  const out = writer.getBytes();
  return Buffer.from(out).toString("utf-8");
}

function jsonToIonPretty(value, ...extra) {
  const writer = makePrettyWriter(...extra);
  writeValue(writer, value);
  writer.close();
  const out = writer.getBytes();
  return Buffer.from(out).toString("utf-8");
}

function jsonToIonBinary(value) {
  const writer = makeBinaryWriter();
  writeValue(writer, value);
  writer.close();
  const out = writer.getBytes();
  return Buffer.from(out);
}

function escapeJson(value) {
  return cloneDeepWith(value, (val, key, parent) => {});
}

exports.ionToJson = ionToJson;
exports.jsonToIonText = jsonToIonText;
exports.jsonToIonPretty = jsonToIonPretty;
exports.jsonToIonBinary = jsonToIonBinary;
exports.escapeJson = escapeJson;
