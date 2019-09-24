- build spidermonkey

```
$ git clone --depth 1 https://github.com/mozilla/gecko-dev.git
[...]

$ cd gecko-dev/js
$ git apply ../../blaze.patch
$ git diff
$ cd ../../
$ cd gecko-dev/js/src/
$ autoconf2.13
$ mkdir build.asserts
$ cd build.asserts
$ ../configure --enable-debug
$ make
[...]
```

uda selesai, js shell ada di dist/bin/js
```
$ ./dist/bin/js
js>
```

- yang harus diganti

1. emptyElementsHeader offset
	- gdb -q [/path/to/js-shell]
	- b &emptyElementsHeader

2. memmove sama mprotect .rel.plt entry
	- mprotect: (readelf -r [/path/to/js-shell] | grep mprotect)
	- memmove: (readelf -r [/path/to/js-shell] | grep memmove)

3. memmove sama mprotect libc entry
