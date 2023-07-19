const express = require('express');
const moment = require('moment');
const _ = require('lodash')
module.exports = {
  getCsatScores:(req, res)=>{
    // console.log(req.query)
    function escape(unsafe) {
      return (unsafe||"").replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return "";
        }
      });
    }
    let projQ=`
    select projects.quoteID,projects.projectID,quoteNo, quoteName, projectCM, projectDP,endDate,isnull(closingDate,endDate) closingDate, csatID, cm.staffName, pm.staffName,quotes.clientID,c.contactName,c.excludeFromCsat,c.contactEmail,c.contactPhoneNo,csatComplete,csatPhoneChased,csatEmailChased,csatChase.note csatChaseNote
    from quotes
    left join projects on projects.quoteID=quotes.quoteID
    left join (select max(endDate) endDate,projectID from jobs group by projectID) j on j.projectID=projects.projectID
    left join staff cm on cm.staffID=projects.projectCM
    left join staff pm on pm.staffID=projects.projectDP
    left join contacts c on c.contactID=quotes.contactID
    outer apply (select top 1 note from AllNotes where jobID=projects.projectID and page='client-sat-report' and tableName='nonResponderTable' order by date DESC) csatChase
    where isnull(closingDate,endDate) between @aprSt and @aprEn`
    db.input('aprSt',new Date(req.query.stDate))
    db.input('aprEn',new Date(req.query.enDate))
    db.query(projQ, (err, projR) => {
      let params={
        url:"/surveys/p572433433679/responses/data",
        method:"get",
        data:{
          filterExpression:"BETWEEN(ISNULL(response:interview_end,response:interview_start),"+moment(req.query.stDate).startOf("d").format()+",GETDATE())"
        }
      }
      forstaReq(params,(err,r,resp)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }else {
          r=r.filter(x=>x.s5).reverse()
          var projects=projR.recordset.filter(el=>r.find(el2=>el2.TSID==el.csatID)).map(el=>{
            var vistaData=r.find(el2=>el2.TSID==el.csatID)
            el.BrokerPanelId=vistaData.TSID
            el.s5=Number(vistaData.s5)
            el.s5_1=Number(vistaData.s5_1?vistaData.s5_1[1]:NaN)
            el.s5_2=Number(vistaData.s5_1?vistaData.s5_1[2]:NaN)
            el.s5_3=Number(vistaData.s5_1?vistaData.s5_1[3]:NaN)
            el.s5_4=Number(vistaData.s5_1?vistaData.s5_1[4]:NaN)
            //get valid responses for S5_1 to _4
            var c=[el.s5_1,el.s5_2,el.s5_3,el.s5_4].filter(el2=>!isNaN(el2) && el2>=0)
            //get mean of valid responses
            el.s5calc=c.reduce((a,b)=>a+Number(b),0)/c.length
            //if there are no valids, take overall
            el.s5calc=isNaN(el.s5calc)?el.s5:el.s5calc
            //repeat above seperately for CM & PM scores
            var cm=[el.s5_3,el.s5_4].filter(el2=>!isNaN(el2) && el2>=0)
            el.s5cm=cm.reduce((a,b)=>a+Number(b),0)/cm.length
            var pm=[el.s5_1,el.s5_2].filter(el2=>!isNaN(el2) && el2>=0)
            el.s5pm=pm.reduce((a,b)=>a+Number(b),0)/pm.length
            //if pm scores are answered n/a for both, and CM scores have been given, assume there was no PM work required
            el.s5pm=isNaN(el.s5pm)?(isNaN(el.s5cm)?el.s5:NaN):el.s5pm
            el.s5cm=isNaN(el.s5cm)?el.s5:el.s5cm
            el.s3=escape(vistaData.s3)
            el.s4=escape(vistaData.s4)
            el.s1a=vistaData.s1?vistaData.s1[1]:null
            el.s1b=vistaData.s1?vistaData.s1[2]:null
            el.s1c=vistaData.s1?vistaData.s1[3]:null
            el.s2=vistaData.s1?vistaData.s1[4]:null
            el.cName=escape(vistaData.PrizeDraw?vistaData.PrizeDraw[1]:null)
            el.cEmail=escape(vistaData.PrizeDraw?vistaData.PrizeDraw[2]:null)
            el.start_time=vistaData.interview_start
            el.cmName=el.staffName[0]
            el.pmName=el.staffName[1]
            el.respDate=vistaData.interview_end||el.start_time
            //el.s5 = original overall score
            //el.s5calc = mean of individual scores if any given. If not, takes the original overall score
            //el.s5cm = mean of CM scores if given. If not, takes original overall score
            //el.s5pm = mean of PM scores if given. If not, and if the CM has no scores either, takes original overall score. If CM has scores, takes NaN
            return el
          })
          res.send(projects)
        }
      })
    })
  },
  getForstaSurveys:(req,res)=>{
    let params={
      url:"/surveys"+(req.query.pid?"/"+req.query.pid:""),
      method:"get",
      data:{
        pageSize:5000
      }
    }
    // console.log(params)
    forstaReq(params,(err,r,resp)=>{
      // console.log(resp,r)
      res.send(r)
    })
  },
  getFortaCompletes:(req,res)=>{
    let params={
      url:"/surveys/"+req.query.pid+"/responses/data",
      method:"get",
      data:{
        filterExpression:"response:status='complete'",
      }
    }
    if (req.query.incompletes) {
      delete params.data.filterExpression
    }
    if (req.query.filterExpression) {
      params.data.filterExpression=req.query.filterExpression
    }
    if (req.query.variables) {
      params.data.variables=req.query.variables
    }
    let addDataChanges=(data)=>{
      return new Promise(done=>{
        if (req.query.dataChanges) {
          db.query("select * from ForstaDataChanges where pid='"+req.query.pid+"' order by changeDate DESC",(err,r)=>{
            if (err) {
              console.log(err)
              res.status(500).send({error:err})
            }else {
              done(data.map(el=>({...el,...{JA2dataChanges:r.recordset.filter(c=>c.respid==el.respid)}})))
            }
          })
        }else {
          done(data)
        }
      })
    }
    getForstaData(req.query).then(resp=>{
      let schema=resp.schema
      let surveyData=resp.data
      addDataChanges(surveyData).then(r=>{
        res.send(r)
      })
    })
    // console.log(req.query)
    // forstaReq(params,(err,r)=>{
    //   addDataChanges(r).then(r=>{
    //     if (req.query.sampleData) {
    //       params.url="/surveys/"+req.query.pid+"/respondents/data"
    //       params.data={}
    //       forstaReq(params,(err,rr)=>{
    //         r=r.map(x=>({...x,...rr.find(s=>s.respid==x.respid)}))
    //         // console.log(r)
    //         if (req.query.captions) {
    //           params.url="/surveys/"+req.query.pid+"/responses/schema"
    //           forstaReq(params,(err,s,resp)=>{
    //             let captioned=[]
    //             promForEach(r,(el,i,vres)=>{
    //               promForEach(Object.keys(el),(key,ii,res)=>{
    //                 let qs=resp.data.root.variables.find(q=>q.name==key) || {}
    //                 if (qs.options) {
    //                   if (qs.fields) {
    //                     //is a list
    //                     promForEach(Object.keys(el[key]),(fieldKey,ik,kres)=>{
    //                       el[key][fieldKey]=qs.fields.find(f=>f.code==fieldKey).texts[0].text
    //                       kres()
    //                     }).then(e=>{
    //                       res()
    //                     })
    //                   }else if (qs.variableType=='multiChoice') {
    //                     el[key]=el[key].true?el[key].true.map(t=>qs.options.find(f=>f.code==t).texts[0].text).join(";"):""
    //                     res()
    //                   }else {
    //                     //single
    //                     el[key]=qs.options.find(f=>f.code==el[key]).texts[0].text
    //                     res()
    //                   }
    //                 }else {
    //                   res()
    //                 }
    //               }).then(()=>{
    //                 console.log(el)
    //                 captioned.push(el)
    //                 vres()
    //               })
    //             }).then(()=>{
    //               console.log(captioned)
    //               res.send(captioned)
    //             })
    //           })
    //         }else {
    //           res.send(r)
    //         }
    //       })
    //     }else {
    //       res.send(r)
    //     }
    //   })
    // })
  },
  getFortaSurveyQuestions:(req,res)=>{
    getForstaSchema(req.query.pid,!req.query.respondentOnly,(req.query.respondentOnly||req.query.respondents),req.body.callhistory).then(e=>{
      // console.log(e)
      if (req.query.variables) {
        let v=req.query.variables.split(",")
        // console.log(e.schema)
        res.send(e.schema.filter(q=>v.includes((q.originalname||q.name)) || v.includes(q.parentVariableName)||!req.query.variables))
      }else {
        res.send(e.schema)
      }
    }).catch(err=>{
      console.log(err)
      res.status(500).send({error:err})
    })
  },
  getForstaReportLink:(req,res)=>{
    getPuppet(page=>{
      getForstaPage(page,'https://author.euro.confirmit.com/surveydesigner/'+req.query.pid).then(page=>{
        (async () => {
          let btn='button[data-reports-menu="true"]'
          // console.log("waiting for ",btn)
          try{
            await page.waitForSelector(btn);
            await page.click(btn);
            // console.log("button clicked")
          }catch(err){
            res.status(500).send("No report found")
          }
          let dash='li[data-testid="dropdown-menu-item"][data-report-available="surveyDashboard"] a'
          try{
            await page.waitForSelector(dash,{timeout:3000});
            // console.log("found dash")
            let a=await page.$(dash)
            let href=await a.evaluate(el=>el.getAttribute("href"))
            // console.log("evaluated dash",href)
            res.send(href)
          }catch(e){
            res.status(500).send("No report found")
          }
        })();
      })
    })
  },
  duplicateForstaQuestion:(req,res)=>{
    forstaReq({url:'/surveys/p865715742508/variables/'},(err,r,resp)=>{
      console.log(resp,r)
      // r.name+="_COPY"
      // r.formName=r.name
      // r.isBackgroundVariable=false
      // r.isHidden=true
      // forstaReq({method:"post",url:'/surveys/p865715742508/variables/',data:r},(err,r,resp)=>{
      //   console.log(r,resp)
      // })
    })
  },
  updateForstaData:(req,res)=>{
    req.body.data=req.body.data || []
    req.body.keys=req.body.keys || ['respid']
    if (req.body.data.find(d=>!d.respid) || !req.body.variables || !req.body.pid) {
      console.log("check error",req.body)
      res.status(500).send({error:"Missing information. Only received: "+JSON.stringify(req.body)})
    }else if(req.body.data.length==0){
      res.send([])
    }else {
      let changeDate=new Date()
      let thisDb=new sql.Request();
      let backupQ=`
      select pid,respid,question,oldValue,changeDate,userID,topLevel,levelPath,field from ForstaDataChanges where changeID<0`
      async function addRows(changesTable,q,r,cb){
        // console.log(r[q].old,JSON.stringify(r[q].old))
        let oldVal=r[q].old
        if (r[q].field&&r[q].old) {
          let obj=JSON.parse(r[q].old)
          oldVal=JSON.stringify(obj[r[q].field])
        }
        if (r.respid==96) {
          console.log(r,q,oldVal)
        }
        await changesTable.rows.add(req.body.pid,r.respid,q,(oldVal||""),changeDate,req.user.user,r[q].topLevel,JSON.stringify(r[q].levelPath||""),r[q].field)
        cb()
        // console.log(changesTable.rows)
      }
      let fData=JSON.parse(JSON.stringify(req.body.data))
      let setData=(index,question,row)=>{
        delete fData[index][question]
        let targetQ=question
        row[question].new=JSON.parse(row[question].new)
        if (row[question].levelPath) {
          let val=row[question].new
          // if (row[question].field) {
          //   val={}
          //   val[row[question].field]=row[question].new
          // }
          //first loop level, to name object at interview level
          let topLevel=Object.keys(row[question].levelPath[0])[0]
          req.body.keys=_.uniq(req.body.keys.concat(row[question].levelPath.map(l=>Object.keys(l)[0])))
          let qdata=[{[topLevel]:row[question].levelPath[0][topLevel],[question]:val}]
          let arr=JSON.parse(JSON.stringify(row[question].levelPath))
          // arr.shift()
          //iterate through loop levels, building object from the inside out
          if (arr.length>1) {
            let ii=1
            // console.log(row[question].levelPath,arr)
            qdata=arr.reduceRight((obj, lev) => {
              let loopName=Object.keys(lev)[0]
              let ret={}
              let last=arr[(arr.length-1)-ii]
              if (last) {
                ret[Object.keys(last)[0]]=last[Object.keys(last)[0]]
              }
              ret[loopName]=obj
              ii++
              return [ret]
            }, [{...arr[(arr.length-1)],...{[question]:val}}])
            qdata=qdata[0][topLevel]
            // console.log("qdata arr",qdata,JSON.stringify(qdata))
          }
          // console.log("qdata",qdata,JSON.stringify(qdata))
          fData[index][topLevel]=qdata
        }else {
          // if (row[question].field) {
          //   let obj={}
          //   obj[row[question].field]=row[question].new
          //   fData[index][targetQ]=obj
          // }else {
            fData[index][targetQ]=row[question].new
          // }
        }
      }
      function updateHistory(){
        return new Promise(topres=>{
          if (req.params.isUndo==="true") {
            promForEach(req.body.variables,(question,i,qres)=>{
              promForEach(req.body.data,(row,ir,rres)=>{
                setData(ir,question,row)
              }).then(e=>qres())
            }).then(e=>topres())
          }else {
            thisDb.query(backupQ,(err,result)=>{
              var changesTable=result.recordset.toTable('ForstaDataChanges')
              promForEach(req.body.variables,(question,i,qres)=>{
                promForEach(req.body.data,(row,ir,rres)=>{
                  if (row.respid==96) {
                    console.log(question,row[question])
                  }
                  if (row[question]) {
                    let li=0
                    let levelPaths=(row[question].levelPaths||[null])
                    let loopLevels=()=>{
                      if (li<levelPaths.length) {
                        row[question].levelPath=levelPaths[li]
                        let fi=0
                        let fields=(row[question].fields||[null])
                        let loopFields=()=>{
                          if (fi<fields.length) {
                            row[question].field=fields[fi]
                            addRows(changesTable,question,row,()=>{
                              fi++
                              loopFields()
                            })
                          }else {
                            setData(ir,question,row)
                            li++
                            loopLevels()
                          }
                        }
                        loopFields()
                      }else {
                        rres()
                      }
                    }
                    loopLevels()
                  }else {
                    rres()
                  }
                }).then(e=>qres())
              }).then(e=>{
                thisDb.bulk(changesTable, (err, result) => {
                  if (err) {
                    console.log(err)
                    res.status(500).send({error:err})
                  }else {
                    topres()
                  }
                })
              })
            })
          }
        })
      }
      updateHistory().then(e=>{
        let schema={}
        schema.keys=req.body.keys||["respid"]
        schema.variables=req.body.variables
        // console.log(schema,fData)
        let reqParams={method:"put",noPaging:true,url:'/surveys/'+req.body.pid+'/'+(req.body.db || 'responses')+'/data',data:{dataSchema:schema,data:fData}}
        forstaReq(reqParams,(err,r,resp)=>{
          console.log(err,r)
          if (err) {
            res.status(500).send({error:err})
          }else {
            console.log(req.body)
            if (req.body.returnData) {
              let respids=_.uniq(req.body.data.map(d=>d.respid))
              getForstaData({pid:req.body.pid,completesFilter:'IN(response:respid,'+respids.join(",")+")"}).then(resp=>{
                res.send(resp.data)
              })
            }else {
              res.send("done")
            }
          }
        })
      })
    }
    // console.log(reqParams)
  },
  undoForstaData:(req,res)=>{
    if (!req.query.pid) {
      res.status(500).send({error:"No pid specified"})
    }else {
      let mapFields=(t)=>Object.keys(req.query).filter(k=>k!="context").map(k=>{
        if (k=="changeDate") {
          return (t?t+".":"")+k+"<='"+req.query[k]+"'"
        }else {
          return "isnull("+(t?t+".":"")+k+",'')"+" in ("+req.query[k].split(",").map(v=>"'"+v+"'")+")"
        }
      }).join(" and ")
      let historyQ=`
      select c.* from ForstaDataChanges c
      cross apply (select top 1 * from ForstaDataChanges s where `+mapFields("s")+` and s.pid=c.pid and s.respid=c.respid and s.question=c.question and isnull(s.field,'')=isnull(c.field,'') and isnull(s.levelPath,'')=isnull(c.levelPath,'') order by changeDate `+("changeDate" in req.query?"DESC":"ASC")+`) sx
      where c.changeID=sx.changeID and `+mapFields("c")
      db.query(historyQ,(err,r)=>{
        if (err) {
          console.log(err)
          res.status(500).send({error:err})
        }else {
          console.log(mapFields(),r.recordset)
          let schema={
            keys:['respid'],
            variables:[]
          }
          let fData=r.recordset.map(row=>{
            let data={respid:row.respid}
            let targetQ=row.question
            schema.variables=_.uniq(schema.variables.concat([row.question]))
            row.levelPath=row.levelPath && row.levelPath.indexOf("[object Object]")==-1?JSON.parse(row.levelPath):null
            if (Array.isArray(row.levelPath)) {
              let val=JSON.parse(row.oldValue)
              if ((req.query.context||{})[row.question]&&row.field) {
                let obj=JSON.parse(req.query.context[row.question])
                obj[row.field]=JSON.parse(row.oldValue)
                val=obj
              }
              // if (row.field) {
              //   val={}
              //   val[row.field]=JSON.parse(row.oldValue)
              // }
              //first loop level, to name object at interview level
              let topLevel=Object.keys(row.levelPath[0])[0]
              schema.keys=_.uniq(schema.keys.concat(row.levelPath.map(l=>Object.keys(l)[0])))

              let qdata=[{[topLevel]:row.levelPath[0][topLevel],[targetQ]:val}]
              let arr=row.levelPath
              //iterate through rest of loop levels, building object from the inside out
              if (arr.length>1) {
                let ii=1
                qdata=arr.reduceRight((obj, lev) => {
                  let loopName=Object.keys(lev)[0]
                  let ret={}
                  let last=arr[(arr.length-1)-ii]
                  if (last) {
                    ret[Object.keys(last)[0]]=last[Object.keys(last)[0]]
                  }
                  ret[loopName]=obj
                  ii++
                  return [ret]
                }, [arr[(arr.length-1)],...{[targetQ]:val}])
                qdata=qdata[0][topLevel]
              }
              data[topLevel]=qdata
            }else {
              let val=JSON.parse(row.oldValue)
              if ((req.query.context||{})[row.question]&&row.field) {
                let obj=JSON.parse(req.query.context[row.question])
                obj[row.field]=JSON.parse(row.oldValue)
                val=obj
              }
              data[targetQ]=val
            }
            return data
          })
          let reqParams={method:"put",noPaging:true,url:'/surveys/'+req.query.pid+'/'+(req.query.db || 'responses')+'/data',data:{dataSchema:schema,data:fData}}
          forstaReq(reqParams,(err,r,resp)=>{
            console.log(err,r)
            if (err) {
              res.status(500).send({error:err})
            }else {
              let deleteQ=`
              delete c from ForstaDataChanges c
              cross apply (select top 1 * from ForstaDataChanges s where `+mapFields("s")+` and s.pid=c.pid and s.respid=c.respid and s.question=c.question and isnull(s.field,'')=isnull(c.field,'') and isnull(s.levelPath,'')=isnull(c.levelPath,'') order by changeDate `+("changeDate" in req.query?"DESC":"ASC")+`) sx
              where c.changeDate>=sx.changeDate and `+mapFields("c")
              db.query(deleteQ,(err,r)=>{
                if (err) {
                  res.status(500).send({error:err})
                }else {
                  // console.log(fData)
                  res.send(fData)
                }
              })
            }
          })
        }
      })
    }
  },
  getForstaDataChanges:(req,res)=>{
    let q=`
    select * from ForstaDataChanges f
    cross apply (select staffName from staff where staffID=(select top 1 staffID from users where userID=f.userID)) s
    outer apply (select top 1 oldValue newValue from ForstaDataChanges o where question=f.question and pid=f.pid and respid=f.respid and ISNULL(field,'')=ISNULL(f.field,'') and ISNULL(levelPath,'')=ISNULL(f.levelPath,'') and changeDate>f.changeDate order by changeDate asc) o
    `+"where pid='"+req.query.pid+"'"+(req.query.respid?" and respid="+req.query.respid:"")+(req.query.question?" and question='"+req.query.question+"'":"")+" order by changeDate DESC"
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }else {
        r.recordset.map(r=>{
          r.levelPath=r.levelPath && r.levelPath.indexOf("[object Object]")==-1?JSON.parse(r.levelPath):null
          return r
        })
        if (req.query.newValues) {
          let getValue=(dbq,frow)=>{
            let val=frow[dbq.question]
            if (dbq.levelPath) {
              val=frow[dbq.question+":"+dbq.levelPath.map(l=>Object.values(l)[0]).join(":")]
            }
            // if (dbq.field) {
            //   val=val[dbq.field]
            // }
            return JSON.stringify(val)
          }
          getForstaData({pid:req.query.pid}).then(e=>{
            res.send(r.recordset.map(r=>({...r,...{newValue:getValue(r,e.data.find(rr=>rr.respid==r.respid))}})))
          })
        }else {
          res.send(r.recordset)
        }
      }
    })
  },
  createForstaToplines:(req,res)=>{
    function getData(){
      if (req.body.data) {
        return new Promise(res=>res(req.body.data))
      }else {
        let params={
          url:"/surveys/"+req.body.pid+"/responses/data",
          method:"get",
          data:{
            filterExpression:req.body.filterExpression,
          }
        }
        if (!req.body.filterExpression) {
          delete params.data.filterExpression
        }
        // console.log(req.query)
        return forstaReq(params)
      }
    }
    let tables=[]
    // console.log(req.body)
    let vars=JSON.stringify(req.body.variables)
    delete req.body.variables
    getForstaData(req.body).then(resp=>{
      req.body.variables=JSON.parse(vars)
      let surveyData=resp.data
      let schema=resp.schema
      if (!req.body.variables) {
        schema=schema.filter(q=>q.isInQnaire)
      }
      // console.log("Got data",surveyData,schema)
      function getCount(question,code,comparison){
        let n=0
        let len=surveyData.length
        for (var i = 0; i < len; i++) {
          if (surveyData[i][question]!==undefined) {
            n=n+(comparison(surveyData[i][question],code)?1:0)
          }
        }
        return n
      }
      // function getRankCount(question,code,rank,comparison){
      //   let n=0
      //   let len=surveyData.length
      //   for (var i = 0; i < len; i++) {
      //     if (surveyData[i][question]!==undefined) {
      //       n=n+(comparison(surveyData[i][question],code,rank)?1:0)
      //     }
      //   }
      //   return n
      // }
      function getFieldCount(question,code,comparison){
        let n=0
        let len=surveyData.length
        for (var i = 0; i < len; i++) {
          let isSelected=false
          if (surveyData[i][question]!==undefined) {
            for(field in surveyData[i][question]){
              if (surveyData[i][question][field]!==undefined && isSelected==false) {
                isSelected=comparison(surveyData[i][question][field],code)
              }
            }
            n=n+(isSelected?1:0)
          }
        }
        return n
      }
      function getBase(question,field){
        let n=0
        let len=surveyData.length
        for (var i = 0; i < len; i++) {
          if (surveyData[i][question]!==undefined) {
            n=n+1
          }
        }
        return n
      }
      function getFieldBase(question,field,oth){
        let n=0
        let len=surveyData.length
        for (var i = 0; i < len; i++) {
          if (surveyData[i][question]!==undefined) {
            if (surveyData[i][question][field]!==undefined) {
              if (oth) {
                if (surveyData[i][question][field][oth]!==undefined) {
                  n=n+1
                }
              }else {
                n=n+1
              }
            }
          }
        }
        return n
      }
      function getOtherSpecifyTable(defTable,variable,option,field){
        let table={rows:[],dataCols:[{id:'respid',type:'number'},{id:'TSID',type:'string'}],columns:[],title:defTable.title+(field?" "+field.code:"")+" - "+option.texts[0].text}
        // console.log("Adding other specify for:",variable.name,option.code,field)
        let varName=""
        table.isRawData=true
        let base=0
        for (var si = 0; si < surveyData.length; si++) {
          let datarow=surveyData[si]
          let obj={}
          if (datarow[variable.name]!==undefined && datarow[variable.name]==option.code) {
            obj.respid=datarow.respid
            obj.TSID=datarow.TSID
            if (field) {
              if (variable.variableType=='singleChoice') {
                varName=variable.name+"_"+variable.fields[fi].code+"$other"
                obj[varName]=datarow[variable.name][variable.fields[fi].code+"$other"]
              }else if(variable.variableType=='multiChoice') {
                if (datarow[variable.name][variable.fields[fi].code]) {
                  varName=variable.name+"_"+variable.fields[fi].code+"_"+variable.fields[fi].code+"$other"
                  obj[varName]=datarow[variable.name][variable.fields[fi].code][option.code+"$other"]
                }
              }
            }else {
              if (variable.variableType=='singleChoice') {
                varName=variable.name+"."+option.code+"$other"
                obj[varName]=datarow[variable.name+"."+option.code+"$other"]
              }else if(variable.variableType=='multiChoice') {
                varName=variable.name+"_"+option.code+"$other"
                obj[varName]=datarow[variable.name][option.code+"$other"]
              }
            }
            // console.log(varName+": ",obj[varName])
            if (obj[varName]!==undefined && obj[varName]!=="") {
              // console.log("ADDING ROW",obj)
              base++
              table.rows.push(obj)
            }
          }
        }
        if (base>0) {
          table.id=_.truncate(varName,{length:25})
          table.dataCols.push({id:varName,type:'string'})
          table.base=base
          // console.log("base:",table.base,"rows:",table.rows.length)
          return table
        }else {
          return null
        }
      }
      let comparitors={
        singleChoice:(a,b)=>a==b,
        rating:(a,b)=>a==b,
        multiChoice:(a,b)=>a?(a.true?a.true.indexOf(b)>-1:false):false,
        multiGrid:(a,b)=>a?(a.true?a.true.indexOf(b)>-1:false):false,
        // ranking:(a,b,rank)=>a[b]==rank
      }
      // console.log("Got schema",resp.data.root.variables)
      let getTitle=v=>v?(v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))):""
      req.body.variables=req.body.variables?(Array.isArray(req.body.variables)?req.body.variables:req.body.variables.split(",")):null
      let schemaVars=schema.filter(v=>req.body.variables?req.body.variables.some(va=>[(v.originalname||v.name),v.parentVariableName].includes(va)):true)
      promForEach(schemaVars,(variable,i,vnext)=>{
        // console.log(variable)
        let cols=(variable.fields || []).map(c=>({...c,...{base:getFieldBase(variable.name,c.code)}}))
        let table={rows:[],dataCols:[{id:'respid',type:'number'},{id:'TSID',type:'string'}],columns:cols,title:getTitle(variable),id:_.truncate(variable.name,{length:25}),base:getBase(variable.name)}
        if (variable.parentVariableName) {
          table.title=getTitle(schema.find(q=>q.name==variable.parentVariableName))+" - "+table.title
        }
        if (variable.variableType=="ranking") {
          variable.variableType='singleChoice'
          variable.options=variable.fields.map((f,fi)=>{
            f.titles=[{text:"Ranked "+(fi+1)}]
            f.code=(fi+1).toString()
            f.hasOtherField=false
            return f
          })
        }
        let specifies=[]
        function addRows(variable,customTable){
          let thisTable=customTable || table
          return promForEach(variable.options,(opt,i,onext)=>{
            let row={
              id:opt.code,
              title:getTitle(opt),
              columns:{}
            }
            if (variable.fields) {
              // console.log("variable.variableType",variable.variableType)
              // console.log("comparitors",comparitors)
              row.total=getFieldCount(variable.name,opt.code,comparitors[variable.variableType])
              promForEach(variable.fields,(field,i,fnext)=>{
                row.columns[field.code]=getCount(variable.name,opt.code,(a,b)=>a?comparitors[variable.variableType](a[field.code],b):false)
                if (opt.hasOtherField && req.body.includeSpecifies==="true") {
                  specifies.push(getOtherSpecifyTable(thisTable,variable,opt,field))
                }
                fnext()
              }).then(e=>{
                thisTable.rows.push(row)
                onext()
              })
            }else {
              // if (variable.variableType=="ranking") {
              //   row.total=getRankCount(variable.name,opt.code,variable.rank,comparitors[variable.variableType])
              // }else {
                row.total=getCount(variable.name,opt.code,comparitors[variable.variableType])
              // }
              if (opt.hasOtherField && req.body.includeSpecifies==="true") {
                specifies.push(getOtherSpecifyTable(thisTable,variable,opt))
              }
              thisTable.rows.push(row)
              onext()
            }
          })
        }
        if (variable.options && variable.variableType!="multiGrid") {
          addRows(variable).then(e=>{
            tables.push(table)
            promForEach(specifies,(spec,si,snext)=>{
              tables.push(spec)
              snext()
            }).then(e=>{
              vnext()
            })
          })
        }else if (variable.variableType=="ranking") {
          // let optTable=JSON.parse(JSON.stringify(table))
          // optTable.id+="_"+(ri+1)
          // let optVar=JSON.parse(JSON.stringify(variable))
          // optVar.variableType='singleChoice'
          // optVar.options=optVar.fields.map((f,fi)=>{
          //   f.titles=[{text:"Ranked "+(fi+1)}]
          //   f.code=(fi+1).toString()
          //   f.hasOtherField=false
          //   return f
          // })
          // addRows(optVar,optTable).then(e=>{
          //   tables.push(optTable)
          //   promForEach(specifies,(spec,si,snext)=>{
          //     tables.push(spec)
          //     snext()
          //   }).then(vnext)
          // })
          // promForEach(variable.fields,(ranking,ri,rknext)=>{
          //   let rankTable=JSON.parse(JSON.stringify(table))
          //   rankTable.id+="_rank_"+(ri+1)
          //   rankTable.title+=" - rank "+(ri+1)
          //   let rankVar=JSON.parse(JSON.stringify(variable))
          //   rankVar.options=JSON.parse(JSON.stringify(rankVar.fields))
          //   rankVar.rank=(ri+1)
          //   rankTable.columns=[]
          //   delete rankVar.fields
          //   addRows(rankVar,rankTable).then(e=>{
          //     // console.log("RANK TABLE",rankTable)
          //     tables.push(rankTable)
          //     promForEach(specifies,(spec,si,snext)=>{
          //       tables.push(spec)
          //       snext()
          //     }).then(e=>{
          //       rknext()
          //     })
          //   })
          // }).then(e=>{
          //
          // })
        }else if ((variable.variableType=='text' && req.body.includeOpens==="true") || (variable.variableType=='numeric' && req.body.includeNumerics==="true")) {
          table.isRawData=true
          if (variable.fields) {
            for (var fi = 0; fi < variable.fields.length; fi++) {
              table.dataCols.push({id:variable.name+"_"+variable.fields[fi].code,type:(variable.variableType=='numeric'?'number':'string')})
            }
          }else {
            table.dataCols.push({id:variable.name,type:(variable.variableType=='numeric'?'number':'string')})
          }
          for (var si = 0; si < surveyData.length; si++) {
            let datarow=surveyData[si]
            let obj={}
            if (datarow[variable.name]!==undefined) {
              obj.respid=datarow.respid
              obj.TSID=datarow.TSID
              if (variable.fields) {
                for (var fi = 0; fi < variable.fields.length; fi++) {
                  if (datarow[variable.name][variable.fields[fi].code]!==undefined) {
                    obj[variable.name+"_"+variable.fields[fi].code]=datarow[variable.name][variable.fields[fi].code]
                  }
                }
              }else {
                obj[variable.name]=datarow[variable.name]
              }
              table.rows.push(obj)
            }
          }
          tables.push(table)
          vnext()
        }else {
          vnext()
        }
      }).then(e=>{
        // console.log(tables,tables.map(t=>t.rows),tables.map(t=>t.columns))
        const xl = require('excel4node');
        const wb = new xl.Workbook();
        var sheetHeaderStyle = wb.createStyle({
          font: {
            italics: true
          },
        });
        var hyperlinkStyle = wb.createStyle({
          font: {
            underline: true,
            color:'#0000FF'
          },
        });
        var tableHeaderStyle = wb.createStyle({
          fill:{
            type:'pattern',
            patternType:'solid',
            bgColor:'#C0C0C0',
            fgColor:'#C0C0C0',
          },
          border: {
            outline: true,
            left:{
              color:'#000000',
              style:'thin'
            },
            right:{
              color:'#000000',
              style:'thin'
            },
            top:{
              color:'#000000',
              style:'thin'
            },
            bottom:{
              color:'#000000',
              style:'thin'
            },
          },
          font:{
            bold:true
          },
          alignment: {
            wrapText: true,
          },
        });
        var tableCellStyle = wb.createStyle({
          border: {
            left:{
              color:'#000000',
              style:'thin'
            },
            right:{
              color:'#000000',
              style:'thin'
            },
            top:{
              color:'#000000',
              style:'dotted'
            },
            outline: true
          },
          alignment: {
            wrapText: true,
            horizontal:'center',
            vertical:'top'
          },
          fill:{
            type:'pattern',
            patternType:'solid',
            bgColor:'#ffffff',
            fgColor:'#ffffff',
          },
        });
        var tableCellStylePerc = wb.createStyle({
          border: {
            left:{
              color:'#000000',
              style:'thin'
            },
            right:{
              color:'#000000',
              style:'thin'
            },
            bottom:{
              color:'#000000',
              style:'dotted'
            },
            outline: true
          },
          alignment: {
            wrapText: true,
            horizontal:'center'
          },
          fill:{
            type:'pattern',
            patternType:'solid',
            bgColor:'#ffffff',
            fgColor:'#ffffff',
          },
          numberFormat:10
        });
        let toc=wb.addWorksheet("TOC",{
          sheetView:{
            showGridLines:false
          }
        });
        promForEach(tables.filter(t=>t),(table,i,tnext)=>{
          const ws = wb.addWorksheet(table.id,{
            sheetView:{
              pane:{
                state:'frozen',
                topLeftCell:'B9'
              }
            }
          });
          ws.column(1).setWidth(29)
          // ws.row(8).freeze()
          // ws.column(2).freeze()
          //add top left cells
          // console.log("Adding table",table)
          ws.cell(1,1).formula(`HYPERLINK("#'TOC'!A1","Back to TOC")`).style(hyperlinkStyle)
          ws.cell(2,1).string("Table "+(i+1))
          ws.cell(3,1).string(table.title)
          ws.cell(4,1).string("Base: "+table.base)
          ws.cell(5,1).string("Filter: All interviews")
          ws.cell(2,1,5,1).style(sheetHeaderStyle)
          if (table.isRawData) {
            //write raw data table for verbs/numerics
            promForEach(table.dataCols,(head,hi,hnext)=>{
              ws.cell(6,hi+1).string(head.id)
              hnext()
            }).then(e=>{
              ws.cell(6,1,6,table.dataCols.length).style(tableHeaderStyle)
              promForEach(table.rows,(row,ri,rnext)=>{
                promForEach(table.dataCols,(head,hi,hnext)=>{
                  if (head.type=='number') {
                    if (row[head.id]) {
                      ws.cell(7+ri,hi+1).number(Number(row[head.id]))
                    }else {
                      ws.cell(7+ri,hi+1).string("")
                    }
                  }else {
                    ws.cell(7+ri,hi+1).string(row[head.id]?row[head.id].toString():"")
                  }
                  hnext()
                }).then(e=>rnext())
              }).then(e=>{
                console.log("Written table ",i)
                tnext()
              })
            })
          }else {
            //add top left total
            ws.cell(7,1,8,1,true).string("Total").style(tableCellStyle).style({
              alignment: {
                horizontal:'left'
              },
              border:{
                bottom:{
                  style:"dotted",
                  color:"#000000"
                }
              }
            })
            ws.cell(6,2).string("Total").style({
              alignment: {
                horizontal:'center'
              }
            })
            ws.cell(7,2).number(table.base).style(tableCellStyle)
            ws.cell(8,2).number(1).style(tableCellStylePerc)
            promForEach(table.columns,(col,ci,cnext)=>{
              //add column headers/totals
              // console.log("Adding column header",col)
              ws.cell(6,3+ci).string(col.texts[0].text).style(tableCellStyle)
              ws.cell(7,3+ci).number(col.base).style(tableCellStyle)
              ws.cell(8,3+ci).number(1).style(tableCellStylePerc)
              cnext()
            }).then(e=>{
              ws.cell(6,1,6,table.columns.length+2).style(tableHeaderStyle)
              let rcount=9
              promForEach(table.rows,(row,ri,rnext)=>{
                //add rows
                // console.log("Adding row",row)
                ws.cell(rcount,1,rcount+1,1,true).string(row.title).style(tableCellStyle).style({
                  alignment: {
                    horizontal:'left'
                  },
                  border:{
                    bottom:{
                      style:"dotted",
                      color:"#000000"
                    }
                  }
                })
                ws.cell(rcount,2).number(row.total).style(tableCellStyle)
                ws.cell(rcount+1,2).number(table.base?row.total/table.base:0).style(tableCellStylePerc)
                promForEach(table.columns,(col,ci,cnext)=>{
                  //add row columns
                  // console.log("Adding row column",row.columns[col.code])
                  ws.cell(rcount,3+ci).number(row.columns[col.code]).style(tableCellStyle)
                  ws.cell(rcount+1,3+ci).number(col.base?row.columns[col.code]/col.base:0).style(tableCellStylePerc)
                  cnext()
                }).then(e=>{
                  rcount=rcount+2
                  rnext()
                })
              }).then(e=>{
                ws.cell(rcount-1,1,rcount-1,table.columns.length+2).style({
                  border: {
                    bottom:{
                      color:'#000000',
                      style:'thin'
                    },
                  }
                })
                console.log("Written table ",i)
                tnext()
              })
            })
          }
        }).then(e=>{
          let params={
            url:"/surveys/"+req.body.pid,
          }
          forstaReq(params,(err,r,resp)=>{
            let name=resp.data.name
            // console.log(resp)
            // wb.write('ExcelFile.xlsx', res);
            toc.cell(1,1,1,4,true).string(name+" toplines - "+moment().format("DD/MM/YYYY")).style({
              font:{
                size:18,
                color:'#44546A'
              }
            })
            promForEach(tables,(table,ti,tnext)=>{
              toc.cell(ti+3,1).formula(`HYPERLINK("#'`+table.id+`'!A1","Table `+(ti+1)+`")`).style(hyperlinkStyle)
              toc.cell(ti+3,2).string(table.id)
              toc.cell(ti+3,3).string(table.title)
              toc.cell(ti+3,4).string("Base: "+table.base)
              toc.cell(ti+3,5).string("Filter: All interviews")
              toc.column(1).setWidth(9)
              toc.column(2).setWidth(8)
              toc.column(3).setWidth(175)
              toc.column(4).setWidth(10)
              toc.column(5).setWidth(16)
              tnext()
            }).then(e=>{
              toc.cell(3,1,tables.length+2,5).style({
                border:{
                  bottom:{
                    style:'thin',
                    color:'#000000'
                  }
                }
              })
              const uuidv4 = require('uuid').v4
              let path="/temp/"+uuidv4()+".xlsx"
              wb.write(publicPath+path,()=>{
                res.send({path:path,filename:name+" toplines "+moment().format("DDMMYY")+".xlsx"})
              })
            })
          })
        })
        // res.send(tables)
      })
    }).catch(err=>{
      console.log(err)
      res.status(500).send({error:err})
    })
  },
  createForstaDatafile:(req,res)=>{
    let defaultVars=['respid','TSID']
    req.body=JSON.parse(JSON.stringify(req.body))
    console.log(req.body)
    function getSpecifyData(datarow,variable,fieldCode,optCode){
      let othname=fieldCode && q.variableType=="singleChoice"?fieldCode+"$other":optCode+"$other"
      if (variable.variableType=='multiGrid' || (!fieldCode && variable.variableType=='singleChoice')) {
        // console.log(variable.name+"."+othname,datarow[variable.name+"."+othname])
        return datarow[variable.name+"."+othname]
      }else if(datarow[variable.name]) {
        // console.log(variable.name+"[]"+othname,datarow[variable.name][othname])
        return datarow[variable.name][othname]
      }
    }
    let vars=JSON.stringify(req.body.variables)
    // delete req.body.variables
    getForstaData(req.body).then(resp=>{
      let schema=resp.schema
      let surveyData=resp.data
      req.body.variables=JSON.parse(vars)
      // console.log("Got data",resp.data)
      // console.log("Got schema",resp.data.root.variables)
      let getTitle=v=>v?(v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))):""
      req.body.variables=req.body.variables?(Array.isArray(req.body.variables)?req.body.variables:req.body.variables.split(",")):null
      let variables=schema.filter(v=>req.body.variables?(req.body.variables.includes((v.originalname||v.name)) || req.body.variables.includes(v.parentVariableName) || defaultVars.includes(v.name)):true)
      variables=variables.filter(variable=>variable.variableType!="info" && (variable.variableType!="text" || req.body.includeOpens==="true" || variable.name=="TSID") && (variable.variableType!="numeric" || req.body.includeNumerics==="true" || variable.name=="respid"))
      let dataCols=[]
      let sheetData=[]
      //set headers
      promForEach(variables,(variable,i,vnext)=>{
        if (variable.fields) {
          for (var fi = 0; fi < variable.fields.length; fi++) {
            dataCols.push({id:variable.name+"_"+variable.fields[fi].code,title:getTitle(variable)+" - "+getTitle(variable.fields[fi])})
            if (variable.options) {
              for (var oi = 0; oi < variable.options.length; oi++) {
                let opt=variable.options[oi]
                if (opt.hasOtherField && req.body.includeSpecifies==="true") {
                  dataCols.push({id:variable.name+"_"+variable.fields[fi].code+"_"+getTitle(opt),title:getTitle(variable)+" - "+getTitle(variable.fields[fi])+"_"+getTitle(opt)})
                }
              }
            }
          }
        }else {
          dataCols.push({id:variable.name,title:getTitle(variable)})
          if (variable.options) {
            for (var oi = 0; oi < variable.options.length; oi++) {
              let opt=variable.options[oi]
              if (opt.hasOtherField && req.body.includeSpecifies==="true") {
                dataCols.push({id:variable.name+"_"+getTitle(opt),title:getTitle(variable)+"_"+getTitle(opt)})
              }
            }
          }
        }
        vnext()
      }).then(e=>{
        //set data
        for (var si = 0; si < surveyData.length; si++) {
          let datarow=surveyData[si]
          let obj={}
          for (var vi = 0; vi < variables.length; vi++) {
            if (datarow[variables[vi].name]!==undefined && datarow[variables[vi].name]!==null) {
              if (variables[vi].fields) {
                //deal with grid/list questions (fields)
                for (var fi = 0; fi < variables[vi].fields.length; fi++) {
                  //if current row was asked this grid item
                  if(datarow[variables[vi].name][variables[vi].fields[fi].code]!==undefined){
                    let code=datarow[variables[vi].name][variables[vi].fields[fi].code]
                    if(variables[vi].variableType=='multiChoice') {
                      obj[variables[vi].name+"_"+variables[vi].fields[fi].code]={
                        code:code.true?code.true.join(";"):"",
                        label:code.true?code.true.map(c=>variables[vi].options.find(o=>o.code==c)?getTitle(variables[vi].options.find(o=>o.code==c)):c).join(";"):""
                      }
                    }else {
                      obj[variables[vi].name+"_"+variables[vi].fields[fi].code]={
                        code:code,
                        label:variables[vi].options?getTitle(variables[vi].options.find(o=>o.code==code)):code
                      }
                    }
                    if (variables[vi].options && req.body.includeSpecifies==="true") {
                      //check options for other specifies
                      for (var oi = 0; oi < variables[vi].options.length; oi++) {
                        let opt=variables[vi].options[oi]
                        if (opt.hasOtherField) {
                          let varName=variables[vi].name+"_"+variable.fields[fi].code+"_"+getTitle(opt)
                          obj[varName]={code:getSpecifyData(datarow,variables[vi],variable.fields[fi].code,opt.code)}
                          obj[varName].label=obj[varName].code
                        }
                      }
                    }
                  }
                }
              }else {
                //is not in grid/list
                let code=datarow[variables[vi].name]
                // console.log(variables[vi],variables[vi].options,datarow,code)
                if(variables[vi].variableType=='multiChoice') {
                  obj[variables[vi].name]={
                    code:code.true?code.true.join(";"):"",
                    label:code.true?code.true.map(c=>variables[vi].options.find(o=>o.code==c)?getTitle(variables[vi].options.find(o=>o.code==c)):c).join(";"):""
                  }
                }else {
                  obj[variables[vi].name]={
                    code:code,
                    label:variables[vi].options?getTitle(variables[vi].options.find(o=>o.code==code)):code
                  }
                }
                if (variables[vi].options && req.body.includeSpecifies==="true") {
                  //check options for other specifies
                  for (var oi = 0; oi < variables[vi].options.length; oi++) {
                    let opt=variables[vi].options[oi]
                    if (opt.hasOtherField) {
                      let varName=variables[vi].name+"_"+getTitle(opt)
                      obj[varName]={code:getSpecifyData(datarow,variables[vi],null,opt.code)}
                      obj[varName].label=obj[varName].code
                    }
                  }
                }
              }
            }
          }
          sheetData.push(obj)
        }
        // console.log(tables,tables.map(t=>t.rows),tables.map(t=>t.columns))
        const xl = require('excel4node');
        const wb = new xl.Workbook();
        const wsCaps = wb.addWorksheet("CAPTIONS");
        const wsCodes = wb.addWorksheet("CODES");

        promForEach(dataCols,(head,hi,hnext)=>{
          wsCodes.cell(1,hi+1).string(head.id)
          wsCaps.cell(1,hi+1).string(head.id+". "+head.title)
          hnext()
        }).then(e=>{
          promForEach(sheetData,(row,ri,rnext)=>{
            promForEach(dataCols,(head,hi,hnext)=>{
              if (row[head.id]!==undefined && row[head.id]!==null) {
                if (row[head.id].code!==undefined && row[head.id].code!==null) {
                  if (!isNaN(row[head.id].code/1) && row[head.id].code!=="") {
                    wsCodes.cell(2+ri,hi+1).number(Number(row[head.id].code))
                  }else{
                    wsCodes.cell(2+ri,hi+1).string(row[head.id].code.toString())
                  }
                  wsCaps.cell(2+ri,hi+1).string(row[head.id].label.toString())
                }
              }
              hnext()
            }).then(e=>rnext())
          }).then(e=>{
            let params={
              url:"/surveys/"+req.body.pid,
            }
            forstaReq(params,(err,r,resp)=>{
              const fs = require('fs');
              let name=resp.data.name
              const uuidv4 = require('uuid').v4
              let id=uuidv4()
              let path="/temp/"+id+".xlsx"
              wb.write(publicPath+path,()=>{
                if (req.body.finalOutcome) {
                  db.query("select staffEmail from staff where staffID in (select staffID from users where userID="+req.user.user+")",(err,emailr)=>{
                    forstaReq({url:'/surveys/'+req.body.pid,method:"get",accept:"application/zip",responseType:"stream"},(err,r,resp)=>{
                      let id2=uuidv4()
                      let zipPath=publicPath + '/temp/'+id2+'.zip'
                      resp.data.pipe(fs.createWriteStream(zipPath)).on('finish',(err)=> {
                        if (err) {
                          console.log(err)
                        }else {
                          const archiver = require('archiver');
                          const DecompressZip = require('decompress-zip');
                          const archive = archiver('zip');
                          let unzipper = new DecompressZip(zipPath);
                          unzipper.on('error', function (err) {
                            console.log(err);
                          });
                          unzipper.on('extract', function (log) {
                            let output = fs.createWriteStream(publicPath+'/temp/'+id+".zip");
                            archive.on('error', function(err){
                              console.log(err)
                            });
                            archive.pipe(output)
                            archive.directory(publicPath+'/temp/'+id+'/',false);
                            archive.append(fs.createReadStream(publicPath+path),{name:name+" sample outcomes "+moment().format("DDMMYY")+".xlsx"})
                            output.on('close', function() {
                              let mailOptions = {
                                to: emailr.recordset[0].staffEmail,
                                subject: "Final outcomes file for "+name,
                                html: '<p>' + header + '<p>Your final outcomes files can now be downloaded using the following link. Please save these file to the job folder for future reference: <a href="http://job-analysis:8080/download-file?path='+publicPath+'/temp/'+id+'.zip&fileName='+name+' Final Exports '+moment().format("DDMMYY")+'.zip">Click to download</a></p>' + footer + '</p>',
                              }
                              transporter.sendMail(mailOptions, (error, info) => {
                                if (error) {
                                  console.log(error);
                                }
                              });
                            });
                            archive.finalize()
                          })
                          unzipper.extract({
                            path: publicPath+'/temp/'+id+'/',
                            restrict:false,
                          })
                        }
                      })
                    }).catch(err=>{
                      let mailOptions = {
                        to: emailr.recordset[0].staffEmail,
                        subject: "An error occured - Final outcomes file for "+name,
                        html: '<p>' + header + '<p>An error occured while producing the final outcomes file. Please contact the system administrator.</p>' + footer + '</p>',
                      }
                      transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                          console.log(error);
                        }
                      });
                    })
                  })
                }
                res.send({path:path,filename:name+" data "+moment().format("DDMMYY")+".xlsx"})
              })
            })
          })
        })
      })
    }).catch(err=>{
      console.log(err)
      res.status(500).send({error:err})
    })
  },
  forstaAgentByDate:(req,res)=>{
    let tables=[]
    let params={
      url:"/surveys/"+req.query.pid+"/responses/data",
      method:"get",
      data:{
        filterExpression:"response:status='complete'",
      }
    }
    // console.log(req.query)
    forstaReq(params).then((surveyData,resp)=>{
      console.log("Got data",surveyData,surveyData[0].callhistoryinfo)
      let params={}
      params.data={}
      params.url="/surveys/"+req.query.pid+"/responses/schema"
      forstaReq(params,(err,s,resp)=>{
        if (err) {
          console.log(err)
          res.status(500).send(err)
        }else {
          // console.log("Got schema",resp.data.root.variables)
          let getTitle=v=>v?(v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))):""
          let dates=surveyData.map(d=>{
            let dt=new Date(d.interview_end)
            dt.setUTCHours(0, 0, 0, 0)
            return dt
          }).filter((date, i, self)=>{
            return self.findIndex(d => d.getTime() === date.getTime()) === i
          }).sort((a,b)=>{
            return a.getTime()-b.getTime()
          })
          // console.log(dates)
          surveyData=surveyData.map(row=>{
            row.LastAgentName=row.LastAgentName?row.LastAgentName:(row.callhistoryinfo?row.callhistoryinfo[row.callhistoryinfo.length-1].Inter_Name:"")
            return row
          })
          let agents=surveyData.map(d=>d.LastAgentName).filter((a, i, self)=>{
            return self.findIndex(d => d === a) === i
          })
          console.log(agents)
          let table={rows:[],columns:[]}
          table.columns.push({id:"Agent",title:"Agent"})
          promForEach(dates,(dte,i,dnext)=>{
            table.columns.push({id:moment(dte).format("YYYY-MM-DD"),title:moment(dte).format("DD/MM/YYYY")})
            dnext()
          }).then(e=>{
            promForEach(agents,(agent,i,anext)=>{
              let row={columns:{Agent:agent}}
              promForEach(dates,(dte,i,dnext)=>{
                let count=0
                for (var i = 0; i < surveyData.length; i++) {
                  let rowData=surveyData[i]
                  let intDate=new Date(rowData.interview_end)
                  if (rowData.LastAgentName==agent && intDate.getFullYear() === dte.getFullYear() && intDate.getMonth() === dte.getMonth() && intDate.getDate() === dte.getDate()) {
                    count++
                  }
                }
                row.columns[moment(dte).format("YYYY-MM-DD")]=count===0?"":count
                dnext()
              }).then(e=>{
                table.rows.push(row)
                anext()
              })
            }).then(e=>{
              const xl = require('excel4node');
              const wb = new xl.Workbook();
              const ws=wb.addWorksheet("Agent x date");
              promForEach(table.columns,(col,ci,cnext)=>{
                //add column headers/totals
                ws.cell(1,1+ci).string(col.title)
                cnext()
              }).then(e=>{
                promForEach(table.rows,(row,ri,rnext)=>{
                  //add rows
                  // console.log("Adding row",row)
                  promForEach(table.columns,(col,ci,cnext)=>{
                    //add row columns
                    row.columns[col.id]=row.columns[col.id]===undefined?"":row.columns[col.id]
                    if (col.id=="Agent" || row.columns[col.id]==="") {
                      ws.cell(2+ri,1+ci).string(row.columns[col.id].toString())
                    }else {
                      ws.cell(2+ri,1+ci).number(Number(row.columns[col.id]))
                    }
                    cnext()
                  }).then(e=>rnext())
                }).then(e=>{
                  let params={
                    url:"/surveys/"+req.query.pid,
                  }
                  forstaReq(params,(err,r,resp)=>{
                    let name=resp.data.name
                    const uuidv4 = require('uuid').v4
                    let path="/temp/"+uuidv4()+".xlsx"
                    wb.write(publicPath+path,()=>{
                      res.send({path:path,filename:name+" agent completes by date "+moment().format("DDMMYY")+".xlsx"})
                    })
                  })
                })
              })
            })
          })
        }
      })
    }).catch(err=>{
      console.log(err)
      res.status(500).send({error:err})
    })
  },
  getFortaIncentives:(req,res)=>{
    let tables=[]
    let params={
      url:"/surveys/"+req.query.pid+"/responses/data",
      method:"get",
      data:{
        filterExpression:"response:status='complete' AND response:INC_amount>0 AND NOT(ISNULL(response:INC_details.4,'')='')",
        variables:"INC_amount,INC_type,respid,INC_charity,INC_details,INC_BACS,TSID,Sample"
      }
    }
    forstaReq(params).then((surveyData,resp)=>{
      let params={}
      params.data={}
      params.url="/surveys/"+req.query.pid+"/responses/schema"
      forstaReq(params,(err,s,resp)=>{
        if (err) {
          console.log(err)
          res.status(500).send(err)
        }else {
          const xl = require('excel4node');
          const wb = new xl.Workbook();
          const wsVex = wb.addWorksheet("VexRewards");
          const wsGoogle = wb.addWorksheet("Master Google Sheet");
          var moneyStyle = wb.createStyle({
            numberFormat: '£#,##0;-£#,##0',
          });
          var dateStyle = wb.createStyle({
            numberFormat: 'dd/mm/yyyy hh:mm',
          });
          var defaultStyle = wb.createStyle();
          // console.log("Got schema",resp.data.root.variables)
          let variables=resp.data.root.variables
          let vexData=[]
          let vexCols=[
            {id:'name',title:"Recipient Name"},
            {id:'email',title:"Recipient Email"},
            {id:'mobile',title:"Mobile Number"},
            {id:'blank0',title:" "},
            {id:'value',title:"Value",type:"number"},
            {id:'brand',title:"Brand"},
            {id:'subject',title:"Subject"},
            {id:'reason',title:"Reason"},
            {id:'message',title:"Message"},
            {id:'sendDate',title:"Send Date and Time",type:"date",style:dateStyle},
            {id:'blank1',title:" "},
            {id:'blank2',title:" "},
            {id:'amazonID',title:"Amazon Program Id"},
            {id:'PO',title:"Purchase Order Number"},
            {id:'jobNum',title:"Job Number"},
            {id:'jobName',title:"Job Name"},
          ]
          let googleData=[]
          let googleCols=[
            {id:'jobNum',title:"Job Number"},
            {id:'jobName',title:"Job Name"},
            {id:'brand',title:"Voucher Type"},
            {id:'sendDate',title:"Sent"},
            {id:'value',title:"Amount",type:"number",style:moneyStyle},
            {id:'name',title:"Resp. Name"},
            {id:'email',title:"Email Address"},
            {id:'mobile',title:"Mobile Number"},
            {id:'sentFrom',title:"Voucher Code Sent From"},
            {id:'mandsID',title:"Marks & Spencers UTL Link"},
            {id:'company',title:"Company"},
            {id:'add1',title:"Add1"},
            {id:'add2',title:"Add2"},
            {id:'add3',title:"Add3"},
            {id:'add4',title:"Add4"},
            {id:'postcode',title:"Post Code"},
            {id:'serial',title:"Serial"},
            {id:'donationRef',title:"Donation Ref"},
            {id:'chequeNo',title:"Cheque Num"},
            {id:'source',title:"Source"},
          ]
          let getTitle=v=>v?(v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))):""
          // console.log(variables)
          let brands=variables.find(v=>v.name=="INC_type").options
          let sources=variables.find(v=>v.name=="Sample").options
          let vexBrands=[
            {brand:"Amazon.co.uk Email Gift Voucher",matches:["amazon"]},
            {brand:"Argos eGift Card",matches:["argos"]},
            {brand:"ASDA eGift Card",matches:["asda"]},
            {brand:"ASOS eGift Card",matches:["asos"]},
            {brand:"B&Q eGift Card",matches:["b&q"]},
            {brand:"boohoo eGift Card",matches:["boohoo"]},
            {brand:"boohooMAN eGift Card",matches:["boohooman"]},
            {brand:"Currys eGift Card",matches:["currys"]},
            {brand:"Foot Locker eGift Card",matches:["foot locker","footlocker"]},
            {brand:"John Lewis eGift Card",matches:["john lewis"]},
            {brand:"Just Eat eGift Card",matches:["justeat","just eat"]},
            {brand:"Marks and Spencer eGift Card",matches:["m&s","marks & spencer","marks and spencer","m and s","m & s"]},
            {brand:"Morrisons eGift Card",matches:["morrisons"]},
            {brand:"Primark eGift Card",matches:["primark"]},
            {brand:"River Island eGift Card",matches:["river island"]},
            {brand:"Sainsburys eGift Card",matches:["sainsburys","sainsburies"]},
            {brand:"Screwfix eGift Card",matches:["screwfix"]},
            {brand:"Selfridges eGift Card",matches:["selfridges"]},
            {brand:"Tesco Digital Gift Card",matches:["tesco"]},
            {brand:"VEX Digital Gift Card",matches:["vex"]},
            {brand:"Waitrose eGift Card",matches:["waitrose"]},
          ]
          let getVexBrand=(text)=>{
            let obj=vexBrands.find(b=>b.matches.find(m=>text.toLowerCase().indexOf(m)>-1))
            return obj?obj.brand:"NOT FOUND - "+text
          }
          for (var i = 0; i < surveyData.length; i++) {
            let row=surveyData[i]
            // console.log(row)
            row.INC_details=row.INC_details || {}
            let vexObj={
              name:_.startCase(_.toLower(row.INC_details["1"]+" "+row.INC_details["2"])),
              email:row.INC_details["4"],
              value:row.INC_amount,
              mobile:row.INC_details["3"],
              brand:getVexBrand(getTitle(brands.find(b=>b.code==row.INC_type))),
              subject:"Here’s your incentive from 'Teamsearch Fieldwork'",
              reason:"Incentives – External",
              message:"Thank you for taking part in our survey. Please click through to claim your code.",
              sendDate:new Date(),
              jobNum:req.query.quoteNo,
              jobName:req.query.quoteName,
              amazonID:"TEA1011"
            }
            vexData.push(vexObj)
            let googleObj={
              jobNum:req.query.quoteNo,
              jobName:req.query.quoteName,
              brand:getTitle(brands.find(b=>b.code==row.INC_type)),
              sendDate:(new Date()).toLocaleString('en-GB').split(",")[0],
              value:row.INC_amount,
              name:_.startCase(_.toLower(row.INC_details["1"]+" "+row.INC_details["2"])),
              email:row.INC_details["4"],
              mobile:row.INC_details["3"],
              sentFrom:'VEX Platform',
              serial:row.TSID,
              source:getTitle(sources.find(b=>b.code==row.Sample))
            }
            googleData.push(googleObj)
          }
          googleData.sort((a,b)=>{
            return a.value-b.value
          })
          googleData.sort((a,b)=>{
            return a.brand.localeCompare(b.brand)
          })
          promForEach(vexCols,(head,hi,hnext)=>{
            wsVex.cell(1,hi+1).string(head.title)
            hnext()
          }).then(e=>{
            promForEach(vexData,(row,ri,rnext)=>{
              promForEach(vexCols,(head,hi,hnext)=>{
                if (row[head.id]!==undefined && row[head.id]!==null) {
                  let val=head.type=='number'?row[head.id]:row[head.id].toString()
                  wsVex.cell(2+ri,hi+1)[head.type || 'string'](val).style(head.style || defaultStyle)
                }
                hnext()
              }).then(e=>rnext())
            }).then(e=>{
              promForEach(googleCols,(head,hi,hnext)=>{
                wsGoogle.cell(1,hi+1).string(head.title)
                hnext()
              }).then(e=>{
                promForEach(googleData,(row,ri,rnext)=>{
                  promForEach(googleCols,(head,hi,hnext)=>{
                    if (row[head.id]!==undefined && row[head.id]!==null) {
                      let val=head.type=='string'?row[head.id].toString():row[head.id]
                      wsGoogle.cell(2+ri,hi+1)[head.type || 'string'](val).style(head.style || defaultStyle)
                    }
                    hnext()
                  }).then(e=>rnext())
                }).then(e=>{
                  let params={
                    url:"/surveys/"+req.query.pid,
                  }
                  forstaReq(params,(err,r,resp)=>{
                    let name=resp.data.name
                    const uuidv4 = require('uuid').v4
                    let path="/temp/"+uuidv4()+".xlsx"
                    wb.write(publicPath+path,()=>{
                      res.send({path:path,filename:name+" incentive templates "+moment().format("DDMMYY")+".xlsx"})
                    })
                  })
                })
              })
            })
          })
        }
      })
    }).catch(err=>{
      res.status(500).send(err)
    })
  },
  addExportHistory:(req,res)=>{
    let q="insert into ForstaExportHistory (pid,variables,exportDate,exportBy) VALUES ('"+req.body.pid+"','"+JSON.stringify(req.body.variables)+"',getdate(),"+req.user.user+")"
    q+=`
    delete from ForstaExportHistory where exportID not in (select min(exportID) from ForstaExportHistory group by variables)`
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err,q)
        res.status(500).send({error:err})
      }else {
        res.send("done")
      }
    })
  },
  getExportHistory:(req,res)=>{
    let q="select * from ForstaExportHistory where pid='"+req.query.pid+"' order by exportDate DESC"
    db.query(q,(err,r)=>{
      if (err) {
        console.log(err)
        res.status(500).send({error:err})
      }else {
        res.send(r.recordset)
      }
    })
  },
  getForstaQuotas:(req,res)=>{
    forstaReq({url:"/surveys/"+req.query.pid+"/quotas"+(req.query.quota?"/"+req.query.quota:"")},(err,r,rr)=>{
      console.log(r)
      let quotas=[]
      promForEach(r,(quo,qi,qnext)=>{
        forstaReq({url:"/surveys/"+req.query.pid+"/quotas/"+quo.name+"/limits"},(err,r,rr)=>{
          if (err) {
            console.log(err)
            res.status(500).send({error:err})
          }
          quotas=quotas.concat(r.map(q=>({quotaName:quo.name,id:q.id,fieldName:q.fields.map(f=>f.answerValueText).join(" - "),limit:q.limit,counter:q.counter,})))
          console.log(r)
          qnext()
        })
      }).then(e=>{
        console.log(quotas)
        res.send(quotas)
      })
    })
  },
  updateForstaQuotas:(req,res)=>{
    let getQuotas=()=>{
      return new Promise(qres=>{
        if (req.body.quotas) {
          qres(req.body.quotas)
        }else {
          let quotas=[]
          forstaReq({url:"/surveys/"+req.query.pid+"/quotas"},(err,r,rr)=>{
            promForEach(r,(quo,qi,qnext)=>{
              forstaReq({url:"/surveys/"+req.query.pid+"/quotas/"+quo.name+"/limits"},(err,r,rr)=>{
                if (r) {
                  quotas.push({name:quo.name,data:r.map(q=>({id:q.id,limit:q.limit}))})
                }
                qnext()
              })
            }).then(e=>qres(quotas))
          })
        }
      })
    }
    getQuotas().then(quotas=>{
      promForEach(quotas,(q,qi,qnext)=>{
        forstaReq({method:"patch",data:q.data,url:"/surveys/"+req.query.pid+"/quotas/"+q.name+"/limits"},(err,r,rr)=>{
          qnext()
        })
      }).then(e=>res.send("done"))
    })
  },
  getForstaActivity:(req,res)=>{
    // let st=req.query.st?moment(req.query.st).format():moment().startOf("d").format()
    // let en=req.query.en?moment(req.query.en).format():moment().format()
    // console.log(st,en)
    console.log("requesting liveForstaData")
    getLiveForstaData(req.query.forceRefresh).then(e=>{
      // console.log("Starting mapping",JSON.parse(JSON.stringify(liveForstaData[0])))
      agents=liveForstaData
      let toMatch={
        forstaGroupID:_.uniq(agents.map(a=>a.timeline.filter(t=>!t.jobID).map(t=>t.SampleGroup)).flat(2)).filter(g=>g),
        forstaID:agents.filter(a=>!a.agentInfo).map(a=>a.InterviewerId).filter(a=>a)
      }
      console.log("unmatched",toMatch)
      let missing={agents:[],jobs:[]}
      let matchJobs=()=>{
        return new Promise(resolve=>{
          if (toMatch.forstaGroupID.length) {
            let jq=`
            select j.jobID,vistaName,quoteNo,quoteName,concat(quoteNo,' ',quoteName,' - ',jobName) jobName,CPI,forstaGroupID from
            jobs j
            left join projects p on p.projectID=j.projectID
            left join quotes q on q.quoteID=p.quoteID
            left join getCPIs(0) c on c.jobID=j.jobID
            where j.forstaGroupID in (`+toMatch.forstaGroupID.join(",")+`)`
            db.query(jq,(err,jr)=>{
              // console.log("before matched jobs",JSON.parse(JSON.stringify(liveForstaData)))
              agents=agents.map(ag=>{
                ag.timeline=ag.timeline.map(ev=>{
                  if (ev.SampleGroup) {
                    let ja2job=jr.recordset.find(j=>ev.SampleGroup==j.forstaGroupID)
                    if (ja2job) {
                      ev.jobName=ja2job.jobName
                      ev.jobID=ja2job.jobID
                    }
                  }
                  // console.log(ev,job)
                  return ev
                })
                ag.jobs=_.uniqBy(ag.timeline,"jobID").filter(j=>j.jobID).map(j=>{
                  let ja2job=jr.recordset.find(jj=>jj.jobID==j.jobID)
                  let jobEvents=ag.timeline.filter(t=>t.jobID==j.jobID)
                  let pastMatch=(ag.jobs||[]).find(jj=>jj.jobID==j.jobID)
                  return {
                    jobID:j.jobID,
                    forstaGroupID:pastMatch?pastMatch.forstaGroupID:(ja2job?ja2job.forstaGroupID:null),
                    jobName:j.jobName,
                    cpi:pastMatch?pastMatch.cpi:(ja2job?ja2job.CPI:null),
                  }
                })
                missing.jobs=_.uniqBy(missing.jobs.concat(ag.timeline.filter(ev=>!ev.jobID&&ev.SampleGroup).map(ev=>({SurveyId:ev.SurveyId,GroupId:ev.SampleGroup}))),"GroupId")
                return ag
              })
              // console.log("missing jobs",missing.jobs)
              resolve()
            })
          }else {
            resolve()
          }
        })
      }
      let matchAgents=()=>{
        return new Promise(resolve=>{
          if (toMatch.forstaID.length) {
            let aq=`
            select a.agentID,agentName,forstaID,payRate,teamID,isEve,isDay,startTime,endTime from agents a
            left join getPayRatesNew() p on p.agentID=a.agentID and p.inputDate='`+moment().format("YYYY-MM-DD")+`'
            outer apply (select agentID,startTime,endTime,bookingTeamID from booking bb where bb.agentID=a.agentID) b
            left join agentTeams t on t.agentTeamID=b.bookingTeamID
            where a.forstaID in (`+toMatch.forstaID.join(",")+`)`
            db.query(aq,(err,ar)=>{
              // console.log("before matched agents",JSON.parse(JSON.stringify(liveForstaData)))
              agents=agents.map(ag=>{
                let pastMatch=agents.find(jj=>(jj.agentInfo||{}).forstaID==ag.InterviewerId)||{}
                ag.agentInfo=pastMatch.agentInfo||ar.recordset.find(a=>a.forstaID==ag.InterviewerId)
                // console.log(ag.agentInfo)
                return ag
              })
              // console.log("after matched agents",JSON.parse(JSON.stringify(liveForstaData)))
              missing.agents=_.uniq(missing.agents.concat(agents.filter(ag=>!ag.agentInfo).map(ag=>ag.InterviewerId)))
              resolve()
            })
          }else {
            resolve()
          }
        })
      }
      matchJobs().then(e=>{
        matchAgents().then(e=>{
          let aggregated=agents.map(ag=>{
            // console.log(ag.InterviewerId,ag.agentInfo)
            let agTimeline=JSON.parse(JSON.stringify(ag.timeline.map(t=>({type:t.type,time:t.time,duration:t.duration,jobID:t.jobID,ExtendedStatus:t.ExtendedStatus}))))
            let lastEvent=agTimeline[agTimeline.length-1]
            lastEvent.duration=lastEvent.duration||((new Date()-new Date(lastEvent.time))/1000)
            let agent={
              InterviewerId:ag.InterviewerId,
              agent:ag.agentInfo,
              sessions:ag.sessions.map(s=>{
                let obj={}
                if (s[0].SampleGroup) {
                  let j={...ag.jobs.find(t=>t.forstaGroupID==s[0].SampleGroup)||{}}
                  obj=j
                  obj.calls=s.filter(t=>t.type=="Call").length
                  obj.completes=s.filter(t=>t.type=="Call"&&t.ExtendedStatus=="13").length
                  obj.sales=j.completes*j.cpi
                }
                obj.startTime=new Date(s[0].time)
                obj.endTime=new Date(new Date(_.last(s).time).getTime()+(_.last(s).duration*1000))
                obj.duration=s.reduce((a,b)=>a+Number(b.duration),0)
                obj.type=s[0].type
                if (obj.type=="Break") {
                  obj.jobName=_.dropRight(_.drop(s[0].info.SurveyId.split(" "))).join(" ")
                }else if (obj.type!="Call") {
                  obj.jobName=obj.type
                  obj.duration=null
                  obj.endTime=null
                }
                if (obj.endTime) {
                  obj.pay=((obj.endTime-obj.startTime)/1000/60/60)*(ag.agentInfo||{payRate:null}).payRate
                }
                return obj
              }),
              // jobs:(ag.jobs||[]).map(j=>{
              //   let jobEvents=agTimeline.filter(t=>t.jobID==j.jobID)
              //   j.startTime=jobEvents[0].time
              //   j.endTime=new Date(_.last(jobEvents).time).getTime()+(_.last(jobEvents).duration*1000)
              //   j.duration=jobEvents.reduce((a,b)=>a+Number(b.duration),0)
              //   j.calls=jobEvents.filter(t=>t.type=="Call").length
              //   j.completes=jobEvents.filter(t=>t.type=="Call"&&t.ExtendedStatus=="13").length
              //   j.pay=(j.duration/60/60)*(ag.agentInfo||{payRate:null}).payRate
              //   j.sales=j.completes*j.cpi
              //   return j
              // }),
              currentStatus:{
                lastEvent:_.last(agTimeline),
                loggedInDuration:agTimeline.filter(t=>t.type=="Login").reduce((a,b)=>a+b.duration,0),
                breaksDuration:agTimeline.filter(t=>t.type=="Break").reduce((a,b)=>a+b.duration,0),
                calls:agTimeline.filter(t=>t.type=="Call").length,
                activeDuration:agTimeline.filter(t=>t.type=="Call").reduce((a,b)=>a+b.duration,0),
                completes:agTimeline.filter(t=>t.type=="Call"&&t.ExtendedStatus=="13").length
              }
            }
            // console.log(agent.jobSessions,agTimeline.filter(t=>t.type=="Login"))
            agent.currentStatus.jobID=(agent.sessions||[]).length?_.last(agent.sessions).jobID:null,
            agent.currentStatus.jobName=(agent.sessions||[]).length?_.last(agent.sessions).jobName:null,
            agent.currentStatus.lastLogin={..._.last(ag.sessions)}
            delete agent.currentStatus.lastLogin.timeline
            agent.currentStatus.sales=agent.sessions.filter(s=>s.cpi).reduce((a,b)=>a+(b.completes*b.cpi),0)
            agent.currentStatus.pay=(agent.currentStatus.loggedInDuration/60/60)*(agent.agent||{payRate:null}).payRate
            return agent
          })
          // console.log("Finished mapping",JSON.parse(JSON.stringify(liveForstaData[0])))
          res.send({activity:aggregated.filter(a=>a.agent),missing:missing})
        })
      })
    }).catch(err=>{
      res.status(500).send(err)
    })
  },
  getForstaAgents:(req,res)=>{
    forstaCATIReq({url:"/interviewers"},(err,r)=>{
      res.send(r.value)
    })
  },
  getForstaGroups:(req,res)=>{
    if (req.query.pid) {
      forstaCATIReq({url:"/surveys('"+req.query.pid+"')/Controller.GetAssignments(callCenterId=1)"},(err,r)=>{
        res.send(r.value)
      })
    }else {
      forstaCATIReq({url:"/groups"},(err,r)=>{
        res.send(r.value)
      })
    }
  },
  removeForstaProjectGroups:(req,res)=>{
    forstaCATIReq({url:"/surveys('"+req.query.pid+"')/Controller.GetAssignments(callCenterId=1)"},(err,r)=>{
      console.log(r.value)
      promForEach(r.value.filter(a=>a.IsGroup).map(a=>a.ResourceId),(grp,gi,gnext)=>{
        forstaCATIReq({url:"/groups("+grp+")/Controller.DeAssignFromCalls(surveyId='"+req.query.pid+"',callCenterId=1)"},(err,r)=>{
          forstaCATIReq({url:"/groups("+grp+")/Controller.DeAssignFromSurvey(surveyId='"+req.query.pid+"',callCenterId=1)"},(err,r)=>{
            forstaCATIReq({method:"delete",url:"/groups("+grp+")"},(err,r)=>{
              if (err) {
                console.log(err)
              }
              gnext()
            })
          })
        })
      }).then(e=>{
        res.send("Done")
      })
    })
  },
  addRespondents:(req,res)=>{
    let data=req.body.data
    console.log(req.body)
    if (req.body.dataTemplate&&req.body.dataRepeats) {
      data=Array(Number(req.body.dataRepeats)).fill(req.body.dataTemplate)
    }
    forstaReq({url:"/surveys/"+req.body.pid+"/respondents/data",method:"post",noPaging:true,data:{data:data,schedulingMode:'none',dataSchema:{variables:Object.keys(data[0])}}},(err,r,rr)=>{
      if (err) {
        console.log(err)
        res.status(500).send(err)
      }else {
        console.log(r)
        getForstaData({pid:req.body.pid,respondents:true,sampleFilter:"IN(:respid,"+rr.data.insertedIds.join(",")+")"}).then(data=>{
          res.send(data)
        })
      }
    })
  }
}
