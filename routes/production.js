const express = require('express');
const moment = require('moment');
const _ = require('lodash')
module.exports = {
  // verbatimBackcoding:(req,res)=>{
  //   let params={
  //     url:"/surveys"
  //   }
  //   // console.log(params)
  //   forstaReq({url:"/surveys",data:{pageSize:5000}},(err,r,resp)=>{
  //     res.render("verbatim-backcoding.ejs",{
  //       title:"Backcoding",
  //       forstaSurveys:r,
  //       tabulatorUpdated:true,
  //       checkType:rew
  //     })
  //   })
  // },
  verbatimChecking:(req,res)=>{
    let params={
      url:"/surveys"
    }
    // console.log(params)
    forstaReq({url:"/surveys",data:{pageSize:5000}},(err,r,resp)=>{
      res.render("verbatim-checking.ejs",{
        title:"Verbatim checking",
        forstaSurveys:r,
        tabulatorUpdated:true,
        checkType:req.params.type
      })
    })
  },
  defineVerbatims:(req,res)=>{
    const natural = require('natural');
    const keyword_extractor = require("keyword-extractor")
    const wordnet = require('wordnet');
    const tokenizer = new natural.RegexpTokenizer({pattern: /[ /-]/})
    const NGrams = natural.NGrams
    let verbs=req.body.verbs.map(verb=>({verb:verb,phrases:NGrams.ngrams(verb, 2).map(t=>t[0]+" "+t[1])}))
    verbs=verbs.map(v=>{
      v.keywords=keyword_extractor.extract(v.verb,{
        language:"english",
        remove_digits: true,
        return_changed_case:true,
        remove_duplicates: true
      });
      return v
    })
    let output=[]
    promForEach(verbs,(verb,i,vnext)=>{
      let outputRow={verb:verb,keywords:[],phrases:[]}
      promForEach(verb.keywords,(keyword,k,knext)=>{
        wordnet.lookup(keyword, function(results) {
          outputRow.keywords.push({
            keyword:keyword,
            dictionary:results
          })
          knext()
        })
      }).then(e=>{
        promForEach(verb.phrases,(phrase,p,pnext)=>{
          console.log(phrase)
          wordnet.lookup(phrase, function(results) {
            outputRow.phrases.push({
              phrase:phrase,
              dictionary:results
            })
            pnext()
          })
        }).then(e=>{
          output.push(outputRow)
          vnext()
        })
      })
    }).then(e=>{
      res.send(output)
    })
  },
  getKeywords:(req,res)=>{
    const natural = require('natural');
    const keyword_extractor = require("keyword-extractor")
    // const Clusters = require('clusters');

    verbs=req.body.verbs.map(v=>{
      let obj={}
      obj.verb=v
      obj.keywords=keyword_extractor.extract(v,{
        language:"english",
        remove_digits: true,
        return_changed_case:true,
        remove_duplicates: true
      });
      return obj
    }).filter(k=>k.keywords)
    function createCodeFrame(corpus) {
      // Tokenize and stem each document in the corpus
      const documents = corpus.map(verb => {
        verb.stemmed=verb.keywords.map(t=>natural.PorterStemmer.stem(t))
        return verb
      });

      // Create a tfidf instance
      const tfidf = new natural.TfIdf();
      let codeFrame=[]
      // Add each document to the tfidf instance
      promForEach(documents,(doc,i,dnext) => {
        tfidf.addDocument(doc.stemmed)
        // console.log(`Added document ${doc} to tfidf instance`)
        dnext()
      }).then(e=>{
        const matrix = [];
        // console.log(tfidf.documents)
        promForEach(tfidf.documents,(doc, i,dnext) => {
          const row = [];
          // console.log(tfidf.listTerms(i))
          promForEach(tfidf.listTerms(i),(term, j,tnext) => {
            row[j] = {term:term.term,tfidf:tfidf.tfidf(term.term, i),original:documents[i].keywords[documents[i].stemmed.indexOf(term.term)]}
            // console.log(term.term,row[j])
            tnext()
          }).then(e=>{
            matrix[i] = {verb:documents[i],data:row}
            dnext()
          })
        }).then(e=>{
          const numClusters = 3;
          let testmatrix=matrix.map(row=>({verb:row.verb.verb,keywords:row.verb.keywords,commonStems:row.data.filter(t=>t.tfidf<4).map(el=>({stem:el.term,word:el.original,tfidf:el.tfidf}))}))
          let deduped=testmatrix.map(row=>row.commonStems).flat(1).filter((value, index, self) =>
            index === self.findIndex((t) => (
              t.stem === value.stem
            ))
          )
          codeFrame=deduped.map(stem=>({stem:stem.stem,word:stem.word,count:testmatrix.filter(r=>r.commonStems.map(s=>s.stem).includes(stem.stem)).length}))
          codeFrame.sort((a,b)=>a.count-b.count)
          res.send({codeFrame:codeFrame,documents:testmatrix})
        })
      })
    }
    createCodeFrame(verbs)

  },
  spellcheck:(req,res)=>{
    const natural = require('natural');
    const wordnet = require('wordnet');
    const tokenizer = new natural.RegexpTokenizer({pattern: /[ /-]/})
    async function check(){
      let list=await wordnet.list()
      // console.log(list.length)
      var spellcheck = new natural.Spellcheck(list);
      let checked=tokenizer.tokenize(req.body.text).map(t=>{
        if (!spellcheck.isCorrect(t)) {
          return {token:t,corrections:spellcheck.getCorrections(t, 1)}
        }else {
          return null
        }
      }).filter(el=>el)
      res.send(checked)
    }
    check()
    //if over quota
    // res.status(500).send({error: 'Over quota'});
    //if not over quota
    // const axios = require("axios");
    // const options = {
    //   method: 'POST',
    //   url: 'https://api.bing.microsoft.com/v7.0/spellcheck',
    //   params: {mode: 'proof', mkt:"en-GB", text: req.body.text},
    //   headers: {
    //     'Ocp-Apim-Subscription-Key': 'ce1210ce43314b33add9e0663454f020',
    //   }
    // };
    // stackBingRequest(options,(err,r)=>{
    //   if (err) {
    //     console.error(err);
    //     res.status(500).send({error:err})
    //   }else {
    //     console.log("BING RESPONSE",req.body.text,r)
    //     res.send(r)
    //   }
    // })
  },
  excelToJson:(req,res)=>{
    if (!req.files) {
      res.status(500).send({error: 'No file detected'});
    }else {
      if (req.files.dataFile.mimetype!="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        res.status(500).send({error: 'Must be an Excel file'});
      }
    }
    var xlsx = require("xlsx");
    let workbook = xlsx.read(req.files.dataFile.data,{sheetRows:2})
    let sheets=workbook.SheetNames
    let sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheets[0]],{defval:""});
    if (req.body.requiredCols) {
      promForEach(req.body.requiredCols.split(","),(col,i,cres)=>{
        if (sheetData[0][col]===undefined) {
          res.status(500).send({error: 'Column "'+col+'" missing'})
        }else {
          cres()
        }
      }).then(e=>{
        let workbook2 = xlsx.read(req.files.dataFile.data)
        let sheetData2 = xlsx.utils.sheet_to_json(workbook2.Sheets[sheets[0]],{defval:""});
        res.send(sheetData2)
      })
    }else {
      let workbook2 = xlsx.read(req.files.dataFile.data)
      let sheetData2 = xlsx.utils.sheet_to_json(workbook2.Sheets[sheets[0]],{defval:""});
      res.send(sheetData2)
    }
  },
  exportVerbsToWord:(req,res)=>{
    function escapeXml(unsafe) {
      return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
      });
    }
    const fs = require('fs');
    const archiver = require('archiver');
    const DecompressZip = require('decompress-zip');
    const archive = archiver('zip');
    let zipPath=publicPath+"/temp/Doc1.zip"
    let docFiles=publicPath+'/templates/Verb checking template v3'
    let docXML=docFiles+"/word/document.xml"
    res.progressUpdate("Getting temp file")
    fs.readFile(docXML, 'utf8', function(err, template){
      let templater=(str,data,esc)=>{
        let newStr=""+str
        let keys=_.uniq(str.match(/{{(.[^{}]*)}}/g)).map(k=>k.replace(/[{}]/g,""))
        // console.log(keys,data)
        for (var i = 0; i < keys.length; i++) {
          // console.log(keys[i],data[keys[i]],"replacing "+keys[i])
          let rx=new RegExp("{{"+keys[i]+"}}",'g')
          if (esc) {
            newStr=newStr.replace(rx,escapeXml(data[keys[i]]))
          }else {
            newStr=newStr.replace(rx,data[keys[i]])
          }
        }
        // console.log(newStr)
        return newStr
      }
      let newRow=`
      <w:tr w:rsidR="00EF31A5" w14:paraId="293D82DC" w14:textId="77777777" w:rsidTr="00E01514">
				<w:sdt>
					<w:sdtPr>
						<w:alias w:val="{{respid}}"/>
						<w:tag w:val="{{respid}}|{{question}}|{{field}}|{{levelPath}}|{{tableCell}}"/>
						<w:id w:val="-658002915"/>
						<w:lock w:val="sdtContentLocked"/>
						<w:placeholder>
							<w:docPart w:val="ED111420946C42C393F78A4A8178C57F"/>
						</w:placeholder>
						<w:showingPlcHdr/>
						<w15:appearance w15:val="hidden"/>
						<w:text/>
					</w:sdtPr>
					<w:sdtContent>
						<w:tc>
							<w:tcPr>
								<w:tcW w:w="463" w:type="pct"/>
								<w:tcBorders>
									<w:top w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
									<w:left w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
									<w:bottom w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
									<w:right w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
								</w:tcBorders>
							</w:tcPr>
							<w:p w14:paraId="11378D31" w14:textId="02C5B84B" w:rsidR="00EF31A5" w:rsidRDefault="00A75ECD">
								<w:pPr>
									<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
								</w:pPr>
								<w:r>
									<w:t>{{respid}}</w:t>
								</w:r>
							</w:p>
						</w:tc>
					</w:sdtContent>
				</w:sdt>
        <w:tc>
					<w:tcPr>
						<w:tcW w:w="4537" w:type="pct"/>
						<w:tcBorders>
							<w:top w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
							<w:left w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
							<w:bottom w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
							<w:right w:val="single" w:sz="8" w:space="0" w:color="BFBFBF"/>
						</w:tcBorders>
						<w:tcMar>
							<w:top w:w="0" w:type="dxa"/>
							<w:left w:w="108" w:type="dxa"/>
							<w:bottom w:w="0" w:type="dxa"/>
							<w:right w:w="108" w:type="dxa"/>
						</w:tcMar>
						<w:hideMark/>
					</w:tcPr>
					<w:p w14:paraId="04F43FBA" w14:textId="3453B5A2" w:rsidR="00EF31A5" w:rsidRDefault="00AF2B2D">
						<w:pPr>
							<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
						</w:pPr>
            <w:proofErr w:type="spellStart"/>
						<w:r>
							<w:t>{{text}}</w:t>
						</w:r>
            <w:proofErr w:type="spellEnd"/>
					</w:p>
				</w:tc>
			</w:tr>
      `
      let rows=req.body.data.map((datarow,i)=>{
        // console.log("sending update",Math.round((i/req.body.data.length)*100)+"%")
        res.progressUpdate("Adding verbatims to file "+Math.round((i/req.body.data.length)*100)+"%")
        return templater(newRow,datarow,true)
      }).join("")
      template=templater(template,{pid:req.body.pid,tableRows:rows})
      // console.log(req.body,template)
      const uuidv4 = require('uuid').v4
      let id=uuidv4()
      const fsx = require("fs-extra");
      let docFilesNew=publicPath+'/temp/'+id+'/'
      res.progressUpdate("Building .docx file")
      fsx.copy(docFiles, publicPath+'/temp/'+id+'/', { overwrite: true },err=>{
        if (err) throw err;
        fs.writeFile(docFilesNew+"/word/document.xml", template, 'utf-8', function (err) {
          if (err) throw err;
          console.log('filelistAsync complete');
          let outputPath='/temp/'+req.body.pid+' spellchecking '+moment().format("DDMMYYYY")+'.docx'
          let output = fs.createWriteStream(publicPath+outputPath);
          archive.on('error', function(err){
            console.log(err)
          });
          archive.pipe(output)
          archive.directory(docFilesNew,false);
          output.on('close', function() {
            res.send(outputPath)
          });
          res.progressUpdate("Building file")
          archive.finalize()
        });
      })
    })
    // const fs = require('fs');
    // var Mustache = require('mustache');
    // fs.readFile(publicPath + '/templates/Verb checking template v2.htm', 'utf8', function(err, template){
    //    var rendered = Mustache.render(template, {
    //      dataRows:req.body.data,
    //      pid:req.body.pid,
    //    })
    //    res.send(rendered)
    //  })
  },
  importVerbsFromWord:(req,res)=>{
    function unescapeXml(unsafe) {
      return unsafe.replace(/&apos;/g, "'")
                 .replace(/&quot;/g, '"')
                 .replace(/&gt;/g, '>')
                 .replace(/&lt;/g, '<')
                 .replace(/&amp;/g, '&');
    };
    const fs = require('fs');
    const uuidv4 = require('uuid').v4
    let id=uuidv4()
    let tempZip=publicPath+"/temp/"+id+".zip"
    res.progressUpdate("Reading .docx file")
    req.files.wordDoc.mv(tempZip,err=>{
      if (err) throw err
      const DecompressZip = require('decompress-zip');
      let unzipper = new DecompressZip(tempZip);
      unzipper.on('error', function (err) {
        console.log(err);
      });
      unzipper.on('extract', function (log) {
        fs.readFile(publicPath+'/temp/'+id+'/word/document.xml', 'utf8', function(err, wordDoc){
          const XmlReader = require('xml-reader');
          const reader = XmlReader.create({stream: true});
          let pid
          let dataRows=[]
          res.progressUpdate("Extracting verbatims")
          let v=0
          reader.on("tag:w:sdtPr",data=>{
            // console.log("found meta tag",data,data.children)
            let pidEl=data.children.find(el=>el.name=="w:alias" && (el.attributes||{})["w:val"]=="pid")
            if (pidEl) {
              pid=(data.children.find(el=>el.name=="w:tag")||{}).attributes["w:val"]
            }
          })
          // reader.on("tag:w:t",data=>{
          //   console.log("text node",data,data.parent.children)
          // })
          reader.on("tag:w:tr",data=>{
            // console.log("found row tag",data.children)
            let dataRow={}
            let sdt=data.children.find(el=>el.name=="w:sdt")
            if (sdt) {
              // console.log("sdt.children",sdt.children)
              let sdtPr=sdt.children.find(el=>el.name=="w:sdtPr")
              if (sdtPr) {
                // console.log("sdtPr.children",sdtPr.children)
                let meta=sdtPr.children.find(el=>el.name=="w:tag")
                // console.log("meta",meta)
                dataRow.metadata=meta.attributes["w:val"]
              }
            }
            let tc=data.children.find(el=>el.name=="w:tc")
            if (tc) {
              // console.log("tc.children",tc.children)
              let p=tc.children.find(el=>el.name=="w:p")
              if (p) {
                let wr=p.children.filter(el=>el.name=="w:r")
                // console.log("w:r children",wr.map(el=>el.children))
                let text=p.children.filter(el=>el.name=="w:r").reduce((acc,curr)=>acc+curr.children.filter(ell=>ell.name=="w:t").reduce((acc2,curr2)=>acc2+(curr2.children.length==0&&curr2.attributes["xml:space"]=="preserve"?[{value:" "}]:curr2.children.filter(c=>c.type=="text")).reduce((acc3,curr3)=>acc3+(curr3.value||" ").toString(),""),""),"")
                dataRow.text=unescapeXml(text)
              }
            }
            dataRows.push(dataRow)
            v++
            res.progressUpdate("Extracting verbatims "+v)
          })
          reader.on('done', data => {
            // console.log(dataRows.filter(el=>el.metadata[0]==96))
            res.send({pid:pid,data:dataRows})
          });
          reader.parse(wordDoc);
        })
      })
      unzipper.extract({
        path: publicPath+'/temp/'+id+'/',
        restrict:false,
      })
    })
    // var windows1252 = require('legacy-encoding');
    // let utf8text=windows1252.decode(req.files.wordDoc.data,'windows1252')
    // let html=utf8text.toString('utf-8')
    // function wordDecode(inp){
    //   var orig = inp;
    //   var s = orig;
    //   // Codes can be found here:
    //   // http://en.wikipedia.org/wiki/Windows-1252#Codepage_layout
    //   s = s.replace( /\u2018|\u2019|\u201A|\uFFFD/g, "'" );
    //   s = s.replace( /\u201c|\u201d|\u201e/g, '"' );
    //   s = s.replace( /\u02C6/g, '^' );
    //   s = s.replace( /\u2039/g, '<' );
    //   s = s.replace( /\u203A/g, '>' );
    //   s = s.replace( /\u2013/g, '-' );
    //   s = s.replace( /\u2014/g, '--' );
    //   s = s.replace( /\u2026/g, '...' );
    //   s = s.replace( /\u00A9/g, '(c)' );
    //   s = s.replace( /\u00AE/g, '(r)' );
    //   s = s.replace( /\u2122/g, 'TM' );
    //   s = s.replace( /\u00BC/g, '1/4' );
    //   s = s.replace( /\u00BD/g, '1/2' );
    //   s = s.replace( /\u00BE/g, '3/4' );
    //   s = s.replace(/[\u02DC|\u00A0]/g, " ");
    //   return s
    // }
    // let parser=require('node-html-parser');
    // const root = parser.parse(html,{
    //   blockTextElements: {
    //     script: false,
    //     style: false,
    //   }
    // });
    // let rowData=[]
    // let table=root.querySelector("body")
    // let body={
    //   pid:table.getAttribute("data-pid"),
    //   question:table.getAttribute("data-question")
    // }
    // promForEach(root.querySelectorAll("table tr"),(el,i,next)=>{
    //   rowData.push({
    //     metadata:el.querySelector("td").getAttribute("title"),
    //     text:wordDecode(el.text).replace(/(\r\n|\n|\r)/gm, "").trim().replace(/\s\s+/g, ' ')
    //   })
    //   next()
    // }).then(e=>{
    //   body.data=rowData
    //   console.log(body)
    //   res.send(body)
    // })
  },
  getForstaDataCleans:(req,res)=>{
    db.query("select * from ForstaDataCleans f cross apply (select staffName from staff where staffID=(select top 1 staffID from users where userID=f.userID)) s where pid='"+req.query.pid+"'"+(req.query.respid?" and respid="+req.query.respid:"")+(req.query.question?" and question='"+req.query.question+"'":"")+" order by cleanDate DESC",(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }else {
        res.send(r.recordset)
      }
    })
  },
  removeForstaDataCleans:(req,res)=>{
    console.log(req.query)
    // req.query=JSON.parse(req.query)
    let mapFields=(t)=>Object.keys(req.query).filter(k=>k!="context").map(k=>{
      if (k=="cleanDate") {
        return (t?t+".":"")+k+"<='"+req.query[k]+"'"
      }else {
        return "isnull("+(t?t+".":"")+k+",'')"+" in ("+req.query[k].split(",").map(v=>"'"+v+"'")+")"
      }
    }).join(" and ")
    console.log("delete from ForstaDataCleans where "+mapFields())
    db.query("delete from ForstaDataCleans where "+mapFields(),(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }else {
        res.send("done")
      }
    })
  },
  addForstaDataCleans:(req,res)=>{
    let changeDate=new Date()
    let backupQ=`
    select pid,respid,question,cleanType,cleanDate,userID,topLevel,levelPath,field,cleanInfo from ForstaDataCleans where cleanID<0`
    async function addRows(changesTable,r,cb){
      await changesTable.rows.add(req.body.pid,r.respid,r.question,r.cleanType,changeDate,req.user.user,r.topLevel,r.levelPath,r.field,r.cleanInfo)

      cb()
    }
    // console.log(req.body.data)
    const transaction = new sql.Transaction()
    transaction.begin(err => {
      let thisDb=new sql.Request(transaction);
      thisDb.query(backupQ,(err,result)=>{
        var cleansTable=result.recordset.toTable('ForstaCleansTemp')
        cleansTable.create=true
        promForEach(req.body.data,(row,ir,rres)=>{
          addRows(cleansTable,row,()=>{
            // fData[ir][question]=row[question].new
            rres()
          })
        }).then(e=>{
          // console.log(changesTable.rows)
          thisDb.bulk(cleansTable, (err, result) => {
            if (err) {
              console.log("ERROR IN BULK CLEANS",err)
              res.status(500).send({error:err})
              transaction.rollback()
            }else {
              let q=`
              MERGE ForstaDataCleans b
               USING (
                  select pid,respid,question,cleanType,cleanDate,userID,topLevel,levelPath,field,cleanInfo
                  from
                  ForstaCleansTemp
               ) AS r ON r.pid=b.pid and b.respid=r.respid and b.question=r.question and b.cleanType=r.cleanType and isnull(b.levelPath,'')=isnull(r.levelPath,'') and isnull(b.field,'')=isnull(r.field,'')
               WHEN MATCHED THEN
                   UPDATE SET
                   b.cleanDate = getdate(),
                   b.cleanInfo = r.cleanInfo,
                   b.userID = `+req.user.user+`
               WHEN NOT MATCHED THEN
                   INSERT (
                       pid,respid,question,cleanType,cleanDate,userID,topLevel,levelPath,field,cleanInfo
                   )
                   VALUES (
                       r.pid,r.respid,r.question,r.cleanType,r.cleanDate,r.userID,r.topLevel,r.levelPath,r.field,r.cleanInfo
                   )
               OUTPUT
                  $action,
                  inserted.*,
                  deleted.*;
              drop table ForstaCleansTemp
              `
               thisDb.query(q,(err,r)=>{
                 if (err) {
                   console.log(err)
                   res.status(500).send({error:err})
                   transaction.rollback()
                 }else {
                   transaction.commit(err=>{
                     if (err) {
                       console.log(err)
                       res.status(500).send({error:err})
                       transaction.rollback()
                     }else {
                       res.send(r.recordset)
                     }
                   })
                 }
               })
            }
          })
        })
      })
    })
  },
}
