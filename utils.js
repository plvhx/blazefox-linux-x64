/**
 * Credit: Samuel Groß
 */

function hex(b)
{
	return ('0' + b.toString(0x10)).substr(-2);
}

function hexlify(bytes)
{
	var res = [];

	for (var i = 0; i < bytes.length; i++)
		res.push(hex(bytes[i]));

	return res.join('');
}

function unhexlify(hexstr)
{
	if (hexstr.length % 2 == 1)
		throw new TypeError("Invalid hex string.");

	var bytes = new Uint8Array(hexstr.length / 2);

	for (var i = 0; i < hexstr.length; i += 2) {
		bytes[i / 2] = parseInt(hexstr.substr(i, 2), 0x10);
	}

	return bytes;
}

function hexdump(data)
{
	if (typeof data.BYTES_PER_ELEMENT !== 'undefined')
		data = Array.from(data);

	var lines = [];

	for (var i = 0; i < data.length; i += 0x10) {
		var chunk = data.slice(i, i + 0x10);
		var parts = chunk.map(hex);

		if (parts.length > 8)
			parts.splice(8, 0, ' ');

		lines.push(parts.join(' '));
	}

	return lines.join("\n");
}

var Struct = (function() {
	var buffer = new ArrayBuffer(8);
	var byteView = new Uint8Array(buffer);
	var uint32View = new Uint32Array(buffer);
	var float64View = new Float64Array(buffer);

	return {
		pack: function(type, value)
		{
			var view = type;
			view[0] = value;
			return new Uint8Array(buffer, 0, type.BYTES_PER_ELEMENT);
		},

		unpack: function(type, bytes)
		{
			if (bytes.length !== type.BYTES_PER_ELEMENT)
				throw Error("Invalid byte array.");

			var view = type;
			byteView.set(bytes);
			return view[0];
		},

		int8: byteView,
		int32: uint32View,
		float64: float64View
	};
})();
