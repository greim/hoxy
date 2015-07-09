/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

import fs from 'fs'
import path from 'path'

/**
 * Return a readable stream from which can
 * be read a megabyte of dummy data.
 */
export default function() {
  return fs.createReadStream(path.join(__dirname, '..', 'files', 'megabyte-of-random-chars'))
}
