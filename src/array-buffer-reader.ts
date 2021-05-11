/*
  Copyright © 2017-2021 Kerry Shetline, kerry@shetline.com

  MIT license: https://opensource.org/licenses/MIT

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
  persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const END_OF_BUFFER = 'End of buffer';

export class ArrayBufferReader {
  private buffer: ArrayBuffer;
  private _offset = 0;
  private readonly bytes: Uint8ClampedArray;

  private static decodeUtf8(bytes: string): string {
    const s: string[] = [];
    const len = bytes.length;

    for (let i = 0; i < len; ++i) {
      const b0 = bytes.charCodeAt(i);

      if (b0 < 0x80)
        s.push(String.fromCharCode(b0));
      else if (b0 < 0xE0) {
        if (i + 1 >= len)
          s.push('?');
        else {
          ++i;
          const b1 = bytes.charCodeAt(i);
          s.push(String.fromCharCode(((b0 & 0x1F) << 6) | (b1 & 0x3F)));
        }
      }
      else if (i + 2 >= len)
        s.push('?');
      else {
        ++i;
        const b1 = bytes.charCodeAt(i);
        ++i;
        const b2 = bytes.charCodeAt(i);
        s.push(String.fromCharCode(((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F)));
      }
    }

    return s.join('');
  }

  constructor(buffer: (ArrayBuffer | ArrayLike<number>)) {
    if (buffer instanceof ArrayBuffer) {
      this.buffer = buffer;
      this.bytes = new Uint8ClampedArray(buffer);
    }
    else {
      this.bytes = new Uint8ClampedArray(buffer);
      this.buffer = <ArrayBuffer> this.bytes.buffer;
    }
  }

  get offset(): number { return this._offset; }
  set offset(newOffset: number) {
    if (newOffset >= this.bytes.byteLength + 1)
      throw new Error(END_OF_BUFFER);

    this._offset = newOffset;
  }

  get size(): number { return this.bytes.byteLength; }

  read(): number {
    if (this._offset >= this.bytes.byteLength)
      return -1;
    else
      return this.bytes[this._offset++];
  }

  readUnsignedInt16(): number {
    if (this._offset + 1 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    return ((this.read() << 8) | this.read());
  }

  readInt16(): number {
    if (this._offset + 1 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    const u = this.readUnsignedInt16();

    return (u >= 0x8000 ? u - 0x10000 : u);
  }

  readUnsignedInt32(): number {
    if (this._offset + 3 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    return ((this.read() * 16777216) + ((this.read() << 16) | (this.read() << 8) | this.read()));
  }

  readInt32(): number {
    if (this._offset + 3 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    const u = this.readUnsignedInt32();

    return (u >= 0x80000000 ? u - 0x100000000 : u);
  }

  readFloat(): number {
    if (this._offset + 3 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    const floatValue = new DataView(this.buffer).getFloat32(this.offset, false);
    this._offset += 4;

    return floatValue;
  }

  readDouble(): number {
    if (this._offset + 7 >= this.bytes.byteLength)
      throw new Error(END_OF_BUFFER);

    const floatValue = new DataView(this.buffer).getFloat64(this.offset, false);
    this._offset += 8;

    return floatValue;
  }

  readAnsiString(): string {
    const s: string[] = [];
    let c;

    while ((c = this.read()) > 0)
      s.push(String.fromCharCode(c));

    return s.join('');
  }

  readAnsiLine(skipHashComments = false): string {
    let s: string[] = [];
    let c: number;
    let line: string;

    while (true) {
      while ((c = this.read()) >= 0) {
        if (c === 10)
          break;
        else if (c === 13) {
          const c2 = this.read();

          if (c2 >= 0 && c2 !== 10)
            --this.offset;

          break;
        }

        s.push(String.fromCharCode(c));
      }

      line = s.join('');

      if (!skipHashComments)
        break;
      else {
        const pos = line.indexOf('#');

        if (pos === 0)
          s = [];
        else {
          if (pos > 0)
            line = line.substring(0, pos);

          break;
        }
      }
    }

    if (c < 0 && line.length === 0)
      return null;

    return line;
  }

  readShortAnsiString(): string {
    const s: string[] = [];
    const len = this.read();

    if (len < 0)
      throw new Error(END_OF_BUFFER);

    for (let i = 0; i < len; ++i) {
      const c = this.read();

      if (c < 0)
        continue;

      s.push(String.fromCharCode(c));
    }

    return s.join('');
  }

  readUtf8String(): string {
    return ArrayBufferReader.decodeUtf8(this.readAnsiString());
  }

  readUtf8Line(): string {
    return ArrayBufferReader.decodeUtf8(this.readAnsiLine());
  }

  readShortUtf8String(): string {
    return ArrayBufferReader.decodeUtf8(this.readShortAnsiString());
  }
}
