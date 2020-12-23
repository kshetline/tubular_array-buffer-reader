import { expect } from 'chai';
import { ArrayBufferReader } from './array-buffer-reader';

describe('ArrayBufferReader', () => {
  const testText = 'first line\n#second line\r\nthird#line\rfourth line';
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
    expect(line === 'fourth line').to.be.true;
  });

  it('should reset offset and ignore # comments correctly.', () => {
    reader.offset = 0;
    let line = reader.readAnsiLine(true);
    expect(line === 'first line').to.be.true;
    line = reader.readAnsiLine(true);
    expect(line === 'third').to.be.true;
    line = reader.readAnsiLine(true);
    expect(line === 'fourth line').to.be.true;
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
});
