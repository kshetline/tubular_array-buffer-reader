import { expect } from 'chai';
import { ArrayBufferReader } from './array-buffer-reader';

describe('ArrayBufferReader', () => {
  const testText = 'first line\n#second line\r\nthird#line\rfourth line-á';
  const testTextExt = testText + '•不😀';
  const testArray = testText.split('').map(c => c.charCodeAt(0));
  const reader = new ArrayBufferReader(testArray);

  it('should read lines correctly, line-ending agnostic.', () => {
    let line = reader.readAnsiLine();
    expect(line === 'first line').to.be.true;
    line = reader.readAnsiLine();
    expect(line === '#second line').to.be.true;
    line = reader.readAnsiLine();
    expect(line === 'third#line').to.be.true;
    line = reader.readAnsiLine();
    expect(line === 'fourth line-á').to.be.true;
  });

  it('should reset offset and ignore # comments correctly.', () => {
    reader.offset = 0;
    let line = reader.readAnsiLine(true);
    expect(line === 'first line').to.be.true;
    line = reader.readAnsiLine(true);
    expect(line === 'third').to.be.true;
    line = reader.readAnsiLine(true);
    expect(line === 'fourth line-á').to.be.true;
  });

  it('should get null if trying to read a line at EOF.', () => {
    const line = reader.readAnsiLine(true);
    expect(line === null).to.be.true;
  });

  const testText2 = '81,FE,DC,BA,98,76,54,40,49,0F,DB,C0,09,21,FB,54,44,2D,18';
  const testArray2 = testText2.split(',').map(c => parseInt(c, 16));
  const reader2 = new ArrayBufferReader(testArray2);

  it('should read byte correctly.', () => {
    const value = reader2.read();
    expect(value).to.equal(129);
  });

  it('should read 2-byte signed int correctly.', () => {
    const value = reader2.readInt16();
    expect(value).to.equal(-292);
  });

  it('should read 2-byte unsigned int correctly.', () => {
    reader2.offset -= 2;
    const value = reader2.readUnsignedInt16();
    expect(value).to.equal(0xFEDC);
  });

  it('should read 4-byte signed int correctly.', () => {
    const value = reader2.readInt32();
    expect(value).to.equal(-1164413356);
  });

  it('should read 4-byte unsigned int correctly.', () => {
    reader2.offset -= 4;
    const value = reader2.readUnsignedInt32();
    expect(value).to.equal(0xBA987654);
  });

  it('should read 4-byte floating point correctly.', () => {
    const value = reader2.readFloat();
    expect(value).approximately(3.141593, 1E-6);
  });

  it('should read 8-byte double precision correctly.', () => {
    const value = reader2.readDouble();
    expect(value).approximately(-3.141592653589793, 1E-15);
  });

  it('readShortAnsiString', () => {
    let buf = Buffer.from('.' + testText, 'latin1');

    buf[0] = testText.length;
    expect(new ArrayBufferReader(buf).readShortAnsiString()).to.equal(testText);
    ++buf[0];
    expect(new ArrayBufferReader(buf).readShortAnsiString()).to.equal(testText);

    expect(() => new ArrayBufferReader(new ArrayBuffer(0)).readShortAnsiString()).to.throw('End of buffer');
  });

  it('readUtf8String', () => {
    expect(new ArrayBufferReader(Buffer.from(testTextExt, 'utf8')).readUtf8String()).to.equal(testTextExt);
    expect(new ArrayBufferReader(Buffer.from(testTextExt, 'utf8').subarray(0, 59)).readUtf8String())
      .to.equal(testTextExt.slice(0, -2) + '?');
    expect(new ArrayBufferReader(Buffer.from(testTextExt, 'utf8').subarray(0, 55)).readUtf8String())
      .to.equal(testTextExt.slice(0, -3) + '?');
    expect(new ArrayBufferReader(Buffer.from(testTextExt, 'utf8').subarray(0, 52)).readUtf8String())
      .to.equal(testTextExt.slice(0, -4) + '?');
    expect(new ArrayBufferReader(Buffer.from(testTextExt, 'utf8').subarray(0, 49)).readUtf8String())
      .to.equal(testTextExt.slice(0, -5) + '?');
  });

  it('readUtf8Line', () => {
    reader.offset = 0;
    expect(reader.readUtf8Line()).to.equal('first line');
  });

  it('readShortUtf8String', () => {
    let buf = Buffer.from('.' + testText, 'utf8');

    buf[0] = testText.length + 1;
    expect(new ArrayBufferReader(buf).readShortUtf8String()).to.equal(testText);
    ++buf[0];
    expect(new ArrayBufferReader(buf).readShortUtf8String()).to.equal(testText);

    expect(() => new ArrayBufferReader(new ArrayBuffer(0)).readShortUtf8String()).to.throw('End of buffer');
  });

  it('offset, size', () => {
    expect(() => reader.offset = 100).to.throw();
    reader.offset = 5;
    expect(reader.offset).to.equal(5);
    expect(reader.size).to.equal(testText.length);
  });

  it('reading numbers', () => {
    let buf = new ArrayBuffer(2);
    let view = new DataView(buf);
    let abr: ArrayBufferReader;

    view.setUint16(0, 45678);
    expect((abr = new ArrayBufferReader(buf)).readUnsignedInt16()).to.equal(45678);
    expect(() => abr.readUnsignedInt16()).to.throw();

    abr.offset = 0;
    view.setInt16(0, -12345);
    expect(abr.readInt16()).to.equal(-12345);
    expect(() => abr.readInt16()).to.throw();
    abr.offset = 0;
    view.setInt16(0, 1);
    expect(abr.readInt16()).to.equal(1);

    buf = new ArrayBuffer(4);
    view = new DataView(buf);
    view.setUint32(0, 3_141_592_653);
    expect((abr = new ArrayBufferReader(buf)).readUnsignedInt32()).to.equal(3_141_592_653);
    expect(() => abr.readUnsignedInt32()).to.throw();

    abr.offset = 0;
    view.setInt32(0, -1_234_567_890);
    expect(abr.readInt32()).to.equal(-1_234_567_890);
    expect(() => abr.readInt32()).to.throw();
    abr.offset = 0;
    view.setInt32(0, 1);
    expect(abr.readInt32()).to.equal(1);

    abr.offset = 0;
    view.setFloat32(0, Math.PI);
    expect(abr.readFloat()).to.approximately(Math.PI, 1E-7);
    expect(() => abr.readFloat()).to.throw();

    buf = new ArrayBuffer(8);
    view = new DataView(buf);
    view.setFloat64(0, Math.PI);
    expect((abr = new ArrayBufferReader(buf)).readDouble()).to.equal(Math.PI);
    expect(() => abr.readDouble()).to.throw();
  });
});
