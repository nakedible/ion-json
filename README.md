# Ion JSON mapping

Amazon Ion is a data format that is a superset of JSON. It supports a
richer set of types than JSON and has both efficient binary and
readable text encodings. However, sometimes Ion data needs to be
passed through JSON interfaces or processed as JSON when full Ion
support is not available.

This specification aims to create a bidirectional mapping of the full
Ion data model to JSON.

Goals:

- All Ion data types fully supported for all values
- Mapping any Ion document to JSON and back preserves the full Ion data model
- Mapping any JSON document to Ion and back preserves the full JSON data model
- Mapping any Ion to JSON and back does not change Ion Hash
- JSON native structure and types are used when equivalent types exist

Non-goals:

- Preserving invalid UTF-8 strings, although some variants of JSON support it
- Preserving numbers not accurately representable as 64-bit IEEE float, although JSON number representation allows them
- Preserving duplicate keys in JSON objects, although some variants of JSON allow them
- Performance is secondary as direct Ion support is preferable if performance is needed

## Type mapping

A simplified mapping of Ion types to JSON representations:

- `null.null` => null
- `null.<type>` => `{"__ion": "null", "value": "<type>"}`
- `bool` => boolean
- `int` => `{"__ion": "int", "value": "1234"}`
- `float` => number
- `decimal` => `{"__ion": "decimal", "coef": "5000", "exp": "-3"}`
- `timestamp` => `{"__ion": "timestamp", "2007-02-23T20:14:33.079+00:00"}`
- `string` => string
- `symbol` => `{"__ion": "keyword", "value": "foo"}`
- `blob` => `{"__ion": "blob", "value": "VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE="}`
- `clob` => `{"__ion": "clob", "value": "VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE="}`
- `struct` => object
- `list` => list
- `sexp` => `{"__ion": "sexp", "value": ["a", "b"]}`
- `annotation` => `{"__ion": "annotation", "annotations": ["int32"], "value": 123}`

## Usage

Parse Ion and convert to Ion JSON:

```
> ionJson.ionToJson("{__ion: 'foo'}")
{ '__ion:__ion': [ { __ion: 'symbol', value: 'foo' } ] }
```

Serialize Ion JSON to Ion binary:

```
> ionJson.jsonToIonBinary({__ion: "int", value: "2147483646"})
<Buffer e0 01 00 ea 24 7f ff ff fe>
```

Serialize Ion JSON to Ion text:

```
> ionJson.jsonToIonText({__ion: "int", value: "2147483646"})
'2147483646'
```

Serialize Ion JSON to Ion pretty printed text:

```
> ionJson.jsonToIonPretty([3])
'[\n  3e0\n]'
```

Escape am arbitrary JSON object for safe serialization using Ion JSON:

```
> ionJson.escapeJson({__ion: "int", value: "2147483646"})
{ '__ion:__ion': 'int', value: '2147483646' }
```

## Known limitations

- Integers larger than 32 bits do not currently work due to limitations in `ion-js`.
- Largely untested, just proof of concept