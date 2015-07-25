import fs from 'fs'
import cheerio from 'cheerio'
import adapt from 'ugly-adapter'
import path from 'path'
import co from 'co'
import assert from 'assert'

co(function*() {

  let docsDir = path.join(__dirname, '..', 'docs')
    , patt = /\.html$/
    , tester = patt.test.bind(patt)
    , pages = []
    , templateName = 'index-template.html'
    , pageName = path.join(docsDir, templateName)
    , noTemplate = name => name !== templateName
    , fileNames = yield adapt(fs.readdir, docsDir).filter(tester).filter(noTemplate)
    , mainPage = yield adapt(fs.readFile, pageName, 'utf8')
    , $ = cheerio.load(mainPage)

  for (var fileName of fileNames) {
    let page = yield adapt(fs.readFile, path.join(docsDir, fileName), 'utf8')
      , $page = cheerio.load(page)
    pages.push($page)
  }

  pages.sort(($a, $b) => {
    let a = parseInt($a('html').attr('data-order'), 10)
      , b = parseInt($b('html').attr('data-order'), 10)
    assert.ok(!isNaN(a), 'data-order not a number')
    assert.ok(!isNaN(b), 'data-order not a number')
    return a - b
  })

  for (var $page of pages) {
    $('#target').append($page('body').html())
  }

  console.log($.html())
}).catch(err => {
  console.error(err.stack)
  process.exit(1)
})
