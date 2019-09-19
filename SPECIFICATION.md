# Ion JSON Mapping

This is the specification of a bidirectional lossless mapping of Ion
documents to JSON documents.

## Ion Types

### Null Values

Ion `null` (or `null.null`) is mapped as JSON `null`. All other typed
`null` values are mapped as `{ "__ion": "null", "value": "<type>" }`,
where `<type>` is literally the type name used in the Ion
specification. For example, `null.sexp` will be translated as `{
"__ion": "null", "value": "sexp" }`.

Typed null value mapping will not be mentioned again on each
respective type, although Ion defines these values to be a part of the
respective type.

### Booleans

Ion `bool` values `true` and `false` are mapped as JSON `true` and
`false` respectively. For example, `true` will be translated as
`true`.

### Integers

Ion `int` values are mapped as JSON `{ "__ion": "int", "value":
"<integer>" }`. The integer value is encoded as base-10 string and may
be arbitrarily long. The integer is signed, so can contain a leading
`-`, but a leading `+` is not allowed. The values `0` and `-0` are
distinct. Ion text format allows for underscores, hex and binary, but
those are not allowed here. For example, `-9007199254740993` will be
translated as `{ "__ion": "int", "value": "-9007199254740993" }`.

### Float Numbers

Ion `float` values are primarily mapped directly as JSON numbers. In
the Ion data model, all float numbers are treated as IEEE-754 64-bit
binary floating point values. The number representation in JSON may be
any number which when converted to IEEE-754 64-bit binary results in
the same value as the original.

In addition, the following values have special encoding:

- `nan` is mapped as JSON `{ "__ion": "float", "value": "nan" }`.
- `+inf` is mapped as JSON `{ "__ion": "float", "value": "+inf" }`.
- `-inf` is mapped as JSON `{ "__ion": "float", "value": "-inf" }`.
- `-0e0` is mapped as JSON `{ "__ion": "float", "value": "-0" }`.

Ion data model considers all encodings of positive infinity, negative
infinity and not-a-number to be respectively equivalent. Negative zero
has a special mapping because some JSON implementations fail to
preserve it.

### Decimal Numbers

Ion `decimal` values are mapped as JSON `{ "__ion": "decimal", "coef":
"<coefficient>", "exp": "<exponent>" }`. Both coefficient and exponent
are encoded as base-10 strings to allow numbers larger than what
JavaScript numbers can hold to be represented. Both coefficient and
exponent are signed, so can contain a leading `-`. A leading `+` is
not allowed. In the Ion data model, an exponent of `0` is equal to an
exponent of `-0`, so either encoding can be used. However, a
coefficient of `0` is distinct from a coefficient of `-0`. For
example, `-0d-6` will be translated as `{ "__ion": "decimal", "coef":
"-0", "exp": "-6" }`.

### Timestamps

Ion `timestamp` values are mapped as JSON `{ "__ion": "timestamp",
"value": "<timestamp>" }`. The timestamp value string matches Ion text
format timestamp encoding. For example, `2019T` will be mapped as `{
"__ion": "timestamp", "value": "2019T" }`. 

### Strings

Ion `string` values are mapped directly as JSON strings. For example,
`'''foo'''` will be translated as `"foo"`.

### Symbols

Ion `symbol` values are mapped as JSON `{ "__ion": "symbol", "value":
"<symbol>" }`. For example, Ion `'hi ho'` will be translated as
`{"__ion": "symbol", "value": "hi ho" }`. Symbol values as structure
field names are represented as plain JSON strings. 

### Blobs

Ion `blob` values are mapped as JSON `{ "__ion": "blob", "value":
"<base64>" }`. The binary data in a blob is to be encoded in RFC 4648
compliant Base64 text, including the required amount of padding. For
example, `{{ dGVzdA== }}` will be translated as `{ "__ion": "blob",
"value": "dGVzdA==" }`.

### Clobs

Ion `clob` values are mapped as JSON `{ "__ion": "clob", "value":
"<base64>" }`. The text data in a blob is to be encoded in RFC 4648
compliant Base64 text, including the required amount of padding. For
example, `{{ "test" }}` will be translated as `{ "__ion": "clob",
"value": "dGVzdA==" }`.

### Structures

Ion `struct` values are mapped as JSON objects. Field names are
represented as JSON strings, even though they have `symbol` type in
Ion. For example, `{a: "foo"}` will be translated as `{"a": "foo"}`.

### Lists

Ion `list` values are mapped as JSON lists. For example, `["foo",
true]` will be translated as `["foo", true]`.

### S-Expressions

Ion `sexp` values are mapped as JSON `{ "__ion": "sexp", "value":
[<value>, ...]}`. The S-expression is an ordered collection of values
which is mapped to a list with each value interpreted according to
this specification. For example, `("foo"+"bar")` will be translated as
`{ "__ion": "sexp", "value": ["foo", { "__ion": "symbol", "value": "+"
}, "bar"] }`.

### Type Annotations

Ion type annotations are mapped as JSON `{ "__ion": "annotation",
"annotations": ["<annotation>", ...], "value": <value> }`. The
annotations form an ordered list of strings which wrap the underlying
value. Multiple annotations on the same value must be folded in to a
single annotation list in JSON, nesting annotation elements is not
allowed. Annotations are symbols in Ion but they are mapped as strings
in JSON. For example, `something::'another thing::foo` will be
translated as `{ "__ion": "annotation", "annotations": ["something",
"another thing"], value: { "__ion": "symbol", "value": "foo" } }`

## Repeated Fields and Escaping

Ion specification requires that repeated fields must be preserved by
all implementations. As JSON is only interoperable when field names
are unique, all repeated fields are mapped as JSON `{ "__ion:<field>":
["<value>", ...] }`. Only the repeated fields should be mapped such
with the first value left with the original field name. For example,
`{a: "1", a: "2", a: "3"}` will be translated as `{"a": "1",
"__ion:a": ["2", "3"]}`.

In order to preserve the interpretation of objects when converted from
Ion to JSON and back, all field names starting with `__ion` will be
escaped by converting them to the same repeated field notation by
prefixing the field name with `__ion:` and making the value a list.
For example, `{__ion: "1", '__ion:foo': "2"}` will be translated as
`{"__ion:__ion": ["1"], "__ion:__ion:foo": ["2"]}`. 

## Additional considerations

### JSON numbers

Although JSON RFC allows for arbitrary length and precision for
numbers, many implementations only support numbers that can be
represented by a IEEE-754 64-bit binary floating point values. Also,
negative zero is not preserved in all JSON implementations.

For these reasons it is left unspecified what happens when a JSON
document containing negative zero or numbers that cannot be
represented by IEEE-754 64-bit binary floats is mapped to Ion. Mapping
Ion to JSON will never produce such values.

### Invalid Ion JSON

When mapping JSON to Ion, it is assumed that the JSON document
contains only valid representation of Ion in JSON. Behavior is not
specified if invalid Ion JSON data is mapped to Ion. For example, if
there is an `__ion` field which contains some value that has not been
specified by this specification. To map arbitrary JSON to Ion,
escaping all values starting with `__ion` as repeated fields is
required. For example the JSON object `{ "__ion": "test", "foo": "bar"
}` should be escaped as `{"__ion:__ion": ["test"], "foo": "bar" }`.

### Parsing JSON Directly as Ion Text

Since the Ion text format is a superset of JSON, it is possible to
parse a JSON document directly as Ion text. However, in the JSON data
model there is only one number type regardless how the number is
represented in JSON. This means that different numbers will be parsed
as different types in Ion, depending on the representation. For
example, in JSON, `0`, `0.0` and `0e0` represent all the same number,
but when parsed as Ion these would be mapped to `int`, `decimal` and
`float` types. Since different JSON encoders might choose different
representations, the types resulting from parsing JSON as Ion are not
stable.

This specification always maps JSON numbers to float type, so the
resulting Ion types are stable.

### Invalid Unicode Strings

Some JSON variants allow strings to contain sequences of arbitrary
16-bit codepoints, to support enconding any JavaScript strings. This
means that such strings might contain illegal surrogate pairs when
escapes are decoded. Ion strings sequences of arbitrary unicode
characters which are normally encoded in UTF-8, which disallows
illegal surrogate pairs as they are not valid unicode characters.

It is not specified what happens if a JSON string containing invalid
unicode characters is mapped to Ion.
