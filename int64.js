//
// Tiny module that provides big (64bit) integers.
//
// Copyright (c) 2016 Samuel Groß
//
// Requires utils.js
//

// Datatype to represent 64-bit integers.
//
// Internally, the integer is stored as a Uint8Array in little endian byte order.
function Int64(v) {
    // The underlying byte array.
    var bytes = new Uint8Array(8);

    switch (typeof v) {
        case 'number':
            v = '0x' + Math.floor(v).toString(16);
        case 'string':
            if (v.startsWith('0x'))
                v = v.substr(2);
            if (v.length % 2 == 1)
                v = '0' + v;

            var bigEndian = unhexlify(v, 8);
            bytes.set(Array.from(bigEndian).reverse());
            break;
        case 'object':
            if (v instanceof Int64) {
                bytes.set(v.bytes());
            } else {
                if (v.length != 8)
                    throw TypeError("Array must have excactly 8 elements.");
                bytes.set(v);
            }
            break;
        case 'undefined':
            break;
        default:
            throw TypeError("Int64 constructor requires an argument.");
    }

    // Return a double whith the same underlying bit representation.
    this.asDouble = function() {
        // Check for NaN
        if (bytes[7] == 0xff && (bytes[6] == 0xff || bytes[6] == 0xfe))
            throw new RangeError("Integer can not be represented by a double");

        return Struct.unpack(Struct.float64, bytes);
    };

    // Return a javascript value with the same underlying bit representation.
    // This is only possible for integers in the range [0x0001000000000000, 0xffff000000000000)
    // due to double conversion constraints.
    this.asJSValue = function() {
        if ((bytes[7] == 0 && bytes[6] == 0) || (bytes[7] == 0xff && bytes[6] == 0xff))
            throw new RangeError("Integer can not be represented by a JSValue");

        // For NaN-boxing, JSC adds 2^48 to a double value's bit pattern.
        this.assignSub(this, 0x1000000000000);
        var res = Struct.unpack(Struct.float64, bytes);
        this.assignAdd(this, 0x1000000000000);

        return res;
    };

    // Return the underlying bytes of this number as array.
    this.bytes = function() {
        return Array.from(bytes);
    };

    // Return the byte at the given index.
    this.byteAt = function(i) {
        return bytes[i];
    };

    // Return the value of this number as unsigned hex string.
    this.toString = function() {
        return '0x' + hexlify(Array.from(bytes).reverse());
    };

    // Basic arithmetic.
    // These functions assign the result of the computation to their 'this' object.

    // Decorator for Int64 instance operations. Takes care
    // of converting arguments to Int64 instances if required.
    function operation(f, nargs) {
        return function() {
            if (arguments.length != nargs)
                throw Error("Not enough arguments for function " + f.name);
            for (var i = 0; i < arguments.length; i++)
                if (!(arguments[i] instanceof Int64))
                    arguments[i] = new Int64(arguments[i]);
            return f.apply(this, arguments);
        };
    }

    // this = -n (two's complement)
    this.assignNeg = operation(function neg(n) {
        for (var i = 0; i < 8; i++)
            bytes[i] = ~n.byteAt(i);

        return this.assignAdd(this, Int64.One);
    }, 1);

    // this = a + b
    this.assignAdd = operation(function add(a, b) {
        var carry = 0;
        for (var i = 0; i < 8; i++) {
            var cur = a.byteAt(i) + b.byteAt(i) + carry;
            carry = cur > 0xff | 0;
            bytes[i] = cur;
        }
        return this;
    }, 2);

    // this = a - b
    this.assignSub = operation(function sub(a, b) {
        var carry = 0;
        for (var i = 0; i < 8; i++) {
            var cur = a.byteAt(i) - b.byteAt(i) - carry;
            carry = cur < 0 | 0;
            bytes[i] = cur;
        }
        return this;
    }, 2);

    // this = a << 1
    this.assignLShift1 = operation(function lshift1(a) {
        var highBit = 0;
        for (var i = 0; i < 8; i++) {
            var cur = a.byteAt(i);
            bytes[i] = (cur << 1) | highBit;
            highBit = (cur & 0x80) >> 7;
        }
        return this;
    }, 1);

    // this = a >> 1
    this.assignRShift1 = operation(function rshift1(a) {
        var lowBit = 0;
        for (var i = 7; i >= 0; i--) {
            var cur = a.byteAt(i);
            bytes[i] = (cur >> 1) | lowBit;
            lowBit = (cur & 0x1) << 7;
        }
        return this;
    }, 1);

    // this = a & b
    this.assignAnd = operation(function and(a, b) {
        for (let i = 0; i < 8; i++) {
            const cura = a.byteAt(i);
            const curb = b.byteAt(i);
            bytes[i] = cura & curb;
        }
        return this;
    }, 2);
}

// Constructs a new Int64 instance with the same bit representation as the provided double.
Int64.fromDouble = function(d) {
    var bytes = Struct.pack(Struct.float64, d);
    return new Int64(bytes);
};

// Constructs a new Int64 instance from a jsvalue; removed the tagged pointer bits.
Int64.fromJSValue = function(bytes) {
    bytes[7] = 0;
    bytes[6] = 0;
    return new Int64(bytes);
};

// Convenience functions. These allocate a new Int64 to hold the result.

// Return a page aligned pointer
function alignDownPage(n) {
    return (new Int64()).assignAnd(n, '0xfffffffffffff000');
}

// Return -n (two's complement)
function Neg(n) {
    return (new Int64()).assignNeg(n);
}

// Return a + b
function Add(a, b) {
    return (new Int64()).assignAdd(a, b);
}

// Return a - b
function Sub(a, b) {
    return (new Int64()).assignSub(a, b);
}

// Return a << 1
function LShift1(a) {
    return (new Int64()).assignLShift1(a);
}

// Return a >> 1
function RShift1(a) {
    return (new Int64()).assignRShift1(a);
}

// Return a == b
function Eq(a, b) {
    if(!(a instanceof Int64)) {
        a = new Int64(a);
    }

    if(!(b instanceof Int64)) {
        b = new Int64(b);
    }

    for(let Idx = 0; Idx < 8; Idx++) {
        if(a.byteAt(Idx) != b.byteAt(Idx)) {
            return false;
        }
    }

    return true;
}

// Some commonly used numbers.
Int64.Zero = new Int64(0);
Int64.One = new Int64(1);
