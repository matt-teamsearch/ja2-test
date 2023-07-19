(function ( $ ) {
  $.fn.forstaDataEditor=function(params){
    var settings = $.extend(true,{
      pid:"",
      variables:[],
      el:this[0],
      completesFilter:"response:status='complete'",
      onRendered:()=>{}
    }, params );
    if (settings.variables.length) {
      settings.variables.push("QC_summary")
      settings.variables.push("status")
      settings.variables.push("LastExtStatus")
      // settings.variables.push("LastCallExtStatusCoded")
      settings.variables.push("FinalLOI")
      settings.variables.push("LastAgentName")
    }
    settings.projectName=settings.pid
    if (settings.pid) {
      $.ajax({glbal:false,url:"/get-forsta-surveys?pid="+settings.pid}).done(e=>{
        console.log(e)
        settings.projectName=e.name
        updateDocTitle("Data Editor - "+e.name)
      })
    }
    // loop schema:
    // row{
    //   respid:123
    //   Q1_loop:[
    //     {
    //       Q1_loop:"Iteration code, e.g. 1",
    //       Q1:"Answer code, e.g. 1"
    //     }
    //     {
    //       Q1_loop:"Iteration code, e.g. 2",
    //       Q1:"Answer code, e.g. 1"
    //     }
    //   ]
    // }
    let isSyncing=true
    function arrayToMulti(arr,options){
      let v2=typeof arr === "string"?arr.split(","):arr
      let obj={
        true:v2,
        false:_.difference(options.map(o=>o.code),v2)
      }
      // console.log(arr,v2,obj)
      return obj
    }
    let getDuration=r=>{
      let dur
      if (r.FinalLOI) {
        dur=r.FinalLOI
      }else {
        dur=(new Date(r.interview_end||r.lastcomplete)).getTime()-(new Date(r.interview_start)).getTime()
        dur=(dur/1000)/60
      }
      // console.log(r,(new Date(r.lastcomplete)).getTime(),(new Date(r.interview_start)).getTime(),dur)
      return Math.max(0,dur)
    }
    function qualityCheck(thisRow){

      function median(values){
        if(values.length ===0) throw new Error("No inputs");
        values.sort(function(a,b){
          return a-b;
        });
        var half = Math.floor(values.length / 2);
        if (values.length % 2){
          return values[half];
        }
        return (values[half - 1] + values[half]) / 2.0;
      }
      let tableData=editorTable.getData("active").filter(r=>(r.lastchannel||1)==1)
      let ret={
        tableData:[],
        cleanData:[]
      }

      let avgLOI=median(tableData.filter(el=>!getRowInfo(el.respid).__rowCleans.find(c=>c.cleanType=="quality")).map(r=>getDuration(r)))
      let gridQs=editorTable.getColumns().map(c=>c.getDefinition()).filter(c=>c.accessorDataParams).filter(c=>c.accessorDataParams.variable.parentVariableName||c.accessorDataParams.variable.currentField)
      let groups=_.groupBy(gridQs,c=>(c.accessorDataParams.variable.parentVariableName||c.accessorDataParams.variable.name))
      function checkRow(row){
        let data=row.getData()
        let addCheck=(check,outcome,checkQ)=>{
          // let tindex=ret.tableData.findIndex(t=>t.respid==data.respid)
          let info=outcome?"pass":(checkQ||"fail")
          // if (tindex>=0) {
          //   getRowInfo(ret.tableData[tindex].respid).__qcChecks.push({question:check,cleanType:"QC",cleanInfo:info})
          // }else {
          //   ret.tableData.push({respid:data.respid,__qcChecks:[{question:check,cleanType:"QC",cleanInfo:info}]})
          // }
          ret.cleanData.push({respid:data.respid,question:check,cleanType:"QC",cleanInfo:info})
        }
        console.log(getDuration(data),avgLOI,avgLOI*0.5)
        addCheck("speeding",getDuration(data)>=avgLOI*0.5)
        let strQs=[]
        Object.keys(groups).forEach((k, i) => {
          let answered=groups[k].filter(g=>data[g.field])
          // console.log(groups[k],answered,answered.map(g=>data[g.field]))
          if(answered.length>4 && answered.map(g=>data[g.field]).every((g,i,arr)=>_.isEqual(g,arr[0]))){
            strQs.push(k)
          }
        });
        addCheck("straightlining",strQs.length==0,strQs.join(","))
      }
      if (thisRow) {
        checkRow(thisRow)
      }else {
        editorTable.getRows("active").filter(r=>(r.getData().lastchannel||1)==1).forEach((row, i) => {
          checkRow(row)
        });
      }
      // console.log(ret)
      return ret
    }
    function qualityRemoval(tableData){
      if (tableData.length==0) {
        alert("No rows matching criteria")
      }
      let qcOpts={
        illogical:'1',
        speeding:'2',
        verbatim:'3',
        straightlining:'4'
      }
      let updateData=tableData.map(r=>({
        respid:r.respid,
        QC_summary:{
          old:r.QC_summary,
          new:arrayToMulti(_.uniq(multiFormatter(r.QC_summary).split(",").concat(getRowInfo(r.respid).__qcChecks.filter(q=>q.cleanInfo!="pass").map(q=>qcOpts[q.question]))),Object.values(qcOpts).map(c=>({code:c})))
        },
        status:{old:r.status,new:"incomplete"},
        LastExtStatus:{old:r.LastExtStatus,new:"51"},
        // LastCallExtStatusCoded:{old:r.LastCallExtStatusCoded,new:"51"},
      }))
      if (tableData.length<10) {
        tableData.forEach((d, i) => {
          editorTable.getRow(d.respid).getElement().classList.add("row-loading")
        });
      }else {
        $("body").addClass("loading")
      }
      console.log(updateData)
      return updateBatchData(updateData,"QC_summary","status","LastExtStatus").then(e=>{
        if (tableData.length<10) {
          let p=updateData.map((d, i) => {
            return editorTable.getRow(d.respid).update({QC_summary:d.QC_summary.new,status:d.status.new,LastExtStatus:d.LastExtStatus.new})
          });
          return Promise.all(p).then(e=>{
            $(".row-loading").removeClass("row-loading")
            editorTable.refreshFilter()
          })
        }else {
          return editorTable.updateData(updateData.map(d=>({respid:d.respid,QC_summary:d.QC_summary.new,status:d.status.new,LastExtStatus:d.LastExtStatus.new}))).then(e=>{
            editorTable.redraw(true)
            $("body").removeClass("loading")
          })
        }
      })
    }
    function qualityReinstate(data){
      if (data.length==0) {
        alert("No QC removals to reinstate")
      }
      let tableData=data.map(r=>({respid:r.respid,status:"complete",LastExtStatus:"13",QC_summary:{true:[1],false:[2,3,4]}}))
      let updateData=data.map(r=>({respid:r.respid,status:{new:"complete",old:r.status},LastExtStatus:{new:"13",old:r.LastExtStatus},QC_summary:{new:{true:[1],false:[2,3,4]},old:r.QC_summary}}))
      if (tableData.length<10) {
        tableData.forEach((d, i) => {
          editorTable.getRow(d.respid).getElement().classList.add("row-loading")
        });
      }else {
        $("body").addClass("loading")
      }
      updateBatchData(updateData,"status","LastExtStatus","QC_summary").then(e=>{
        if (tableData.length<10) {
          let p=tableData.map((d, i) => {
            return editorTable.getRow(d.respid).update(d)
          });
          Promise.all(p).then(e=>{
            $(".row-loading").removeClass("row-loading")
            editorTable.refreshFilter()
          })
        }else {
          editorTable.updateData(tableData).then(e=>{
            editorTable.redraw(true)
            editorTable.refreshFilter()
            $("body").removeClass("loading")
          })
        }
      })
    }
    let tableHistory=[]
    function getRowInfo(respid){
      return (tableHistory.find(r=>r.respid==respid)||{})
    }
    let historyUpdating=false
    let waitForHistory=func=>{
      let waitint=setInterval(()=>{
        if (!historyUpdating) {
          clearInterval(waitint)
          func()
        }
      },100)
    }
    function updateHistory(respid,newVals){
      historyUpdating=true
      if (!respid) {
        tableHistory=[]
        editorTable.updateData(editorTable.getData().map(r=>({respid:r.respid,isHistoryUpdating:true})))
      }else {
        editorTable.getRow(respid).update({isHistoryUpdating:true})
      }
      return new Promise(res=>{
        if (respid) {
          editorTable.getRow(respid).getElement().classList.add("row-loading")
        }
        $.ajax({global:false,url:"/get-forsta-data-changes?pid="+settings.pid+(respid?"&respid="+respid:"")+(newVals?"&newValues=true":"")}).done(dataChanges=>{
          $.ajax({global:false,url:"/get-forsta-data-cleans?pid="+settings.pid+(respid?"&respid="+respid:"")}).done(dataCleans=>{
            let updateData=editorTable.getData().filter(r=>!respid||r.respid==respid).map((trow, i) => {
              let rowCleans={respid:trow.respid,__rowCleans:dataCleans.filter(c=>c.respid==trow.respid && c.cleanType!="QC")}
              let rowHistory={respid:trow.respid,__rowHistory:dataChanges.filter(c=>c.respid==trow.respid)}
              let rowQC={respid:trow.respid,__qcChecks:dataCleans.filter(c=>c.respid==trow.respid && c.cleanType=="QC")}
              rowQC.__qcChecks.push({cleanType:"QC",question:"illogical",cleanInfo:((trow.QC_summary||{}).true||[]).includes("1")?"fail":"pass"})
              return {...rowCleans,...rowHistory,...rowQC}
            });
            if (respid) {
              tableHistory=tableHistory.filter(h=>h.respid!=respid).concat([updateData[0]])
            }else {
              tableHistory=updateData
            }
            historyUpdating=false
            if (respid) {
              editorTable.getRow(respid).update({isHistoryUpdating:false})
              editorTable.getRow(respid).getElement().classList.remove("row-loading")
            }else {
              editorTable.updateData(editorTable.getData().map(r=>({respid:r.respid,isHistoryUpdating:false})))
            }
            // editorTable.updateData(updateData).then(e=>{
            //   if (respid) {
            //     editorTable.getRow(respid).reformat()
            //   }else {
            //     editorTable.redraw(true)
            //   }
            //   console.log("history updated")
              res(dataChanges.concat(dataCleans))
            // })
          }).fail(err=>console.log(err))
        }).fail(err=>console.log(err))
      })
    }
    function updateBatchData(updateData){
      //updateData=[{respid,new,old,field,topLevel,levelPath}]
      // let keys=_.uniq(updateData.map(row=>Object.keys(row).map(k=>row[k].topLevel)).flat(2).concat(['respid'])).filter(r=>r)
      let thisIsUndo=JSON.stringify(isUndo)
      isUndo=false
      // console.log(JSON.stringify(updateData))
      // console.log(updateData,JSON.parse(JSON.stringify(dataToSync)))
      let oldData=JSON.parse(JSON.stringify(dataToSync))
      let rawDataToSync=JSON.parse(JSON.stringify(oldData.concat(updateData)))
      dataToSync=oldData.concat(updateData).map(d=>{
        Object.keys(d).forEach((k, i) => {
          if (d[k]&&k!="respid") {
            let firstChange=oldData.find(el=>el.respid==d.respid&&el[k])
            // console.log(oldData,JSON.parse(JSON.stringify(firstChange||{})))
            if (firstChange) {
              d[k].old=firstChange[k].old
            }
            if(d[k].field){
              console.log(d,k,oldData.filter(el=>el.respid==d.respid&&el[k]).map(el=>el[k].field))
              d[k].fields=_.uniq(rawDataToSync.filter(el=>el.respid==d.respid&&el[k]).map(el=>el[k].field))
            }
            if(d[k].levelPath){
              d[k].levelPaths=_.uniq(rawDataToSync.filter(el=>el.respid==d.respid&&el[k]).map(el=>el[k].levelPath))
            }
          }
        });
        return _.merge(...dataToSync.concat(updateData).filter(dd=>dd.respid==d.respid),d)
      })
      dataToSync=_.unionBy(_.reverse(_.clone(dataToSync)),'respid')
      // console.log(dataToSync.filter(el=>el.respid==96))
      if (isSyncing&&dataToSync.length) {
        let vars=_.uniq(dataToSync.map(d=>Object.keys(d)).flat(2)).filter(v=>v!="respid")
        // console.log(vars)
        return new Promise((res,rej)=>{
          let data={
            // keys:keys,
            variables:vars,
            pid:settings.pid,
            data:dataToSync.map(d=>{
              let newD=JSON.parse(JSON.stringify(d))
              vars.forEach((v, i) => {
                if (newD[v]) {
                  newD[v].new=JSON.stringify(newD[v].new)
                  newD[v].old=JSON.stringify(newD[v].old||"")
                }
              });
              return newD
            }),
            returnData:true
            // data:updateData.filter(r=>!vars.find(v=>r[v]===undefined)),
          }
          // console.log(JSON.stringify(data))
          dataToSync=[]
          $.ajax({url:"/update-forsta-data/"+thisIsUndo,method:"post",data:data,global:false}).fail(e=>{
            console.log(e)
            rej(e)
          }).done(e=>{
            refreshSyncBtn()
            // getVerbs()
            // addDataCleans(updateData)
            editorTable.updateData(e)
            // console.log(e)
            res(e)
          })
        })
      }else {
        refreshSyncBtn()
        return new Promise(res=>{
          res()
        })
      }
    }
    function cellLoader(el){
      let dots=getLoadingDots({css:{right:'unset',left:'0',bottom:'3px',"font-size":"5px"}})
      $(el).append(dots)
      $(el).css({"pointer-events":"none","background":""})
      let warning=document.createElement("span")
      return {
        dots:dots,
        warning:warning,
        done:(newEl)=>{
          if (!newEl) {
            newEl=el
          }
          warning.remove()
          $(el).css({"pointer-events":"","background":""})
          $(el).find("span.loading-dots").remove()
        },
        error:(newEl)=>{
          if (!newEl) {
            newEl=el
          }
          $(el).css({"pointer-events":"","background":"#cf00002e"})
          $(warning).css({position:"absolute",top:"2px",right:"2px",color:"#cf0000","font-size":"9px"})
          warning.innerHTML="Update failed"
          $(el).append(warning)
          $(el).find("span.loading-dots").remove()
        }
      }
    }
    function undoChanges(params){
      //all fields are optional
      //{question,respid,field,levelPath,question}
      params=params||{}
      return new Promise((res,rej)=>{
        params.pid=settings.pid
        $.ajax({url:"/undo-forsta-data/",data:params,global:false}).fail(e=>{
          console.log(e)
          rej(e)
        }).done(e=>{
          // getVerbs()
          // addDataCleans(updateData)
          res(e)
        })
      })
    }
    function removeCleans(params){
      params.pid=settings.pid
      return new Promise((res,rej)=>$.ajax({url:"/remove-forsta-data-cleans",data:params}).done(()=>{
        res()
        // updateHistory()
      }).fail(rej))
    }
    function addCleans(changeData){
      //{cleanType,respid,question,field,levelPath}
      console.log(changeData)
      return new Promise((res,rej)=>$.ajax({url:"/add-forsta-data-cleans",method:"POST",global:false,data:{pid:settings.pid,data:changeData}}).done(()=>{
        res()
        // updateHistory()
      }).fail(rej))
    }
    function getTargetQ(variable){
      if (variable.isSpecify) {
        if (variable.fields) {
          return variable.currentField.code+"$other"
        }else {
          return (variable.otherVariable.originalname||variable.otherVariable.name)+"."+variable.otherCode+"$other"
        }
      }else {
        return (variable.originalname||variable.name)
      }
    }
    function getLevelledTargetQ(variable){
      if (variable.loopParent) {
        return variable.loopParent
      }else {
        return getTargetQ(variable)
      }
    }
    function getSpecifyData(datarow,specifyVariable){
      let fieldCode=(specifyVariable.currentField||{}).code
      let optCode=specifyVariable.otherCode
      let variable=specifyVariable.otherVariable
      if (variable.variableType=='multiGrid' || (!fieldCode && variable.variableType=='singleChoice')) {
        return datarow[variable.name+"."+specifyVariable.name]
      }else if(datarow[variable.name]) {
        return datarow[variable.name][specifyVariable.name]
      }
    }
    function setSpecifyData(c,specifyVariable){
      let fieldCode=(specifyVariable.currentField||{}).code
      let optCode=specifyVariable.otherCode
      let variable=specifyVariable.otherVariable
      if (variable.variableType=='multiGrid' || (!fieldCode && variable.variableType=='singleChoice')) {
        c.getRow().update({[variable.name+"."+specifyVariable.name]:c.getValue()})
      }else if(c.getData()[variable.name]) {
        let d={[variable.name]:(c.getData()[variable.name]||{})}
        d[variable.name][specifyVariable.name]=c.getValue()
        c.getRow().update(d)
      }
    }
    let isEditing=false
    let listEditor=(cell,onR,success,cancel,editorParams)=>{
      console.log("editor started",cell.getElement())
      isEditing=true
      let inp=document.createElement("input")
      inp.type="text"
      $(inp).css({width:"100%",height:"100%"})
      inp.width="100%"
      inp.height="100%"
      let val=editorParams.multiSelect?(cell.getValue()||[]).true:cell.getValue()
      inp.value=editorParams.multiSelect?(val||[]).join(","):val
      let blurFunc=()=>{
        let o=typeof val ==="string"?[val]:val
        let n=inp.value.split(",")
        if (!_.isEqual(_.sortBy(n), _.sortBy(o))) {
          if (editorParams.multiSelect) {
            let mapped=inp.value.split(",").filter(v=>v!="%na%")
            success({
              true:mapped,
              false:_.difference(editorParams.values.map(o=>o.value),mapped)
            })
          }else {
            success(inp.value=="%na%"?undefined:inp.value)
          }
        }else {
          cancel()
        }
      }
      let sel=document.createElement("div")
      onR(()=>{
        $(document).on('mousedown', '.vscomp-option', function () {
          $(inp).off("blur")
        });
        inp.after(sel)
        VirtualSelect.init({
          ele: sel,
          dropboxWrapper:'body',
          multiple:editorParams.multiSelect,
          search:false,
          disableSelectAll:true,
          hideClearButton:true,
          markSearchResults:true,
          setValueAsArray:true,
          optionsCount:10,
          dropboxWidth:"200px",
          labelRenderer: data=>{
            return data.value+". "+data.label
          }
        })
        sel.setOptions(editorParams.values)
        sel.setValue(val)
        $(sel).change(function(e){
          // console.log(e,sel.getSelectedOptions())
          let opts=(sel.getSelectedOptions()||{})
          let excl=Array.isArray(opts)?opts.find(o=>o.isExclusive):null
          if (excl && sel.value.length>1) {
            sel.setValue([excl.value])
            return false
          }
          inp.value=editorParams.multiSelect?sel.value.join(","):sel.value
          $(inp).focus()
          $(inp).blur(function(e){
            blurFunc()
          })
        })
        setTimeout(()=>sel.open(),100)
        $(sel).on('afterClose', function(e){
          // blurFunc()
          blurFunc()
        });

        $(inp).keydown(function(e){
          if (e.which==13) {
            e.preventDefault()
            $(inp).blur()
            return false
          }else if (isNaN(e.key/1) && (!editorParams.multiSelect || e.key!=",") && e.key!="Backspace" && e.key!="Delete") {
            e.preventDefault()
            return false
          }
        })
        function delay(callback, ms) {
          var timer = 0;
          return function() {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
              callback.apply(context, args);
            }, ms || 0);
          };
        }
        $(inp).keyup(delay(function(e){
          let vals=inp.value.split(",").filter(v=>editorParams.values.find(o=>o.value==v))
          // inp.value=vals.join(",")
          sel.setValue(vals,true)
          // if (!isNaN(e.key/1)) {
          // }
        },300))
        inp.focus()
        if (!editorParams.multiSelect) {
          inp.select()
        }
      })
      $(inp).blur(function(e){
        blurFunc()
      })
      return inp
    }
    let listFilter=(cell,onR,success,cancel,editorParams)=>{
      // console.log(cell,onR,success,cancel,editorParams)
      let val=editorParams.multiSelect?(cell.getValue()||[]).true:cell.getValue()
      let sel=document.createElement("div")
      let id="filterWrapper-"+(new Date()).getTime()
      VirtualSelect.init({
        ele: sel,
        dropboxWrapper:'body',
        additionalClasses:id,
        multiple:true,
        markSearchResults:true,
        setValueAsArray:true,
        optionsCount:10,
        emptyValue:null,
        placeholder:"Filter...",
        dropboxWidth:"200px",
        labelRenderer: data=>{
          return data.value+". "+data.label
        }
      })
      sel.setOptions(editorParams.values.map(o=>({...o,...{alias:[o.value.toString()]}})))
      sel.setValue(val)
      let filterType="any"
      $(sel).on("beforeOpen",function(e){
        // console.log(e)
        if ($("."+id+" .vscomp-dropbox .btn-sm").length==0) {
          function toggleAnyAll(btn){
            e.preventDefault()
            e.stopPropagation()
            filterType=btn.attr("data-type")
            $("."+id+" .vscomp-dropbox .btn-sm").removeClass("btn-primary")
            $("."+id+" .vscomp-dropbox .btn-sm[data-type='"+btn.attr("data-type")+"']").addClass("btn-primary")
            blurFunc()
          }
          function addBtn(txt,def){
            let thisBtn=$(document.createElement("button"))
            thisBtn.addClass("btn btn-sm").html(txt).attr("data-type",txt.toLowerCase())
            if (def) {
              thisBtn.addClass("btn-primary")
            }
            thisBtn.click(function(e){
              toggleAnyAll(thisBtn)
            })
            $("."+id+" .vscomp-dropbox").append(thisBtn)
            return thisBtn
          }
          addBtn("Any",true)
          addBtn("All")
          addBtn("Exact")
          addBtn("None")
        }
      })
      $(sel).on("change reset",function(e){
        // console.log(e,sel.getSelectedOptions())
        let opts=(sel.getSelectedOptions()||{})
        let excl=Array.isArray(opts)?opts.find(o=>o.isExclusive):null
        if (excl && sel.value.length>1) {
          sel.setValue([excl.value])
        }
        blurFunc()
      })
      let blurFunc=()=>{
        let o=typeof val ==="string"?[val]:val
        let n=sel.value
        // console.log(o,n,_.isEqual(_.sortBy(n), _.sortBy(o)))
        if (!_.isEqual(_.sortBy(n), _.sortBy(o))||o===undefined) {
          success({type:filterType,value:n})
        }else {
          cancel()
        }
      }
      // console.log(sel)
      return sel
    }

    let getTitle=v=>v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))
    let multiFormatter=(v,lab)=>{
      // console.log(v,v?(v.true||[]).map(vv=>lab?codeToLabel(vv):vv).join(","):"")
      return v?(v.true||[]).map(vv=>vv).join(","):""
    }
    let tableFooter=document.createElement("div")
    tableFooter.classList.add("tabulator-footer")
    function updateFooter(){
      let showing="Showing "+editorTable.getData("active").length+" / "+editorTable.getData().length+" rows"
      let selected=editorTable.getRows("selected").length?"<span class='selected-indicator'>"+editorTable.getRows("selected").length+" selected</span>":""
      tableFooter.innerHTML=showing+selected
    }
    let isUndo=false
    let showLabels=false
    let getCol=(variable)=>{
      let codeToLabel=v=>getTitle(variable.options.find(c=>c.code==v))
      let multiFormatterL=(v,lab)=>{
        // console.log(v,v?(v.true||[]).map(vv=>lab?codeToLabel(vv):vv).join(","):"")
        return v?(v.true||[]).map(vv=>lab?codeToLabel(vv):vv).join(","):""
      }
      let singleFormatter=(v,lab)=>v?lab?codeToLabel(v):v:""
      if (variable.isGroup) {
        let grpdisp={title:variable.name,sortable:false,cssClass:"placeholder-col",visible:!variable.isGrouped,field:variable.name+"-group"}
        console.log("in getCol",variable,grpdisp)
        return {title:"<button id='"+variable.name.replaceAll(":","-")+"-group-btn"+"' class='btn btn-light' style='margin:4px;padding:4px 11px;width:97%'>+</button>",sortable:false,headerClick:(e,col)=>{
          e.stopPropagation()
          let allCols=editorTable.getColumns()
          col.getSubColumns().filter(c=>c.getField() && c.getField()!=variable.name+"-group" && c.getDefinition().title).forEach((s, i) => s.toggle())
          variable.columns.forEach((c, i) => {
            if (c.columns) {
              allCols.filter(s=>s.getField()==c.columns[0].name+"-group").forEach(g=>g.toggle())
            }
          })
          // console.log(variable.name.replaceAll(":","-"),$('#'+variable.name.replaceAll(":","-")+"-group-btn")[0])
          $('#'+variable.name.replaceAll(":","-")+"-group-btn").html($('#'+variable.name.replaceAll(":","-")+"-group-btn").html()=="+"?"-":"+")
        },columns:[grpdisp].concat(variable.isInfoCol?variable.columns:variable.columns.map(c=>getCol(c)))}
      }else {
        let isMulti=variable.variableType=="multiChoice"
        let getVal=(v,d)=>{
          if (variable.currentField) {
            return (d[variable.name]||{})[variable.currentField.code]
          }else {
            return d[variable.name]
          }
        }
        let setVal=(c)=>{
          if (variable.currentField) {
            let d={[variable.name]:(c.getData()[variable.name]||{})}
            d[variable.name][variable.currentField.code]=c.getValue()
            c.getRow().update(d)
          }
        }
        let cleanAction=(cleanType,cell,unmark)=>{
          return (e,c)=>{
            let qname=getTargetQ(variable)
            let selected=editorTable.getSelectedRows()
            let changeParams={question:qname,field:(variable.currentField||{}).code,levelPath:variable.levelPath}
            let els='.tabulator-cell[tabulator-field="'+c.getField()+'"]'
            let tableData=editorTable.getData("active").filter(el=>el[c.getField()])
            if (cell) {
              if(selected.length>1){
                els=selected.map(r=>r.getCell(c.getField()).getElement())
                tableData=selected.map(s=>s.getData()).filter(el=>el[c.getField()])
              }else {
                els=cell.getElement()
                tableData=[cell.getData()]
              }
            }
            let loader=cellLoader(els)
            let data=tableData.map(row=>{
              let obj=JSON.parse(JSON.stringify(changeParams))
              obj.cleanType=cleanType
              obj.respid=row.respid
              return obj
            })
            let formattedData
            let funcSelect=()=>{
              if (unmark) {
                formattedData=changeParams
                formattedData.respid=_.uniqBy(data,"respid").map(d=>d.respid).join(",")
                formattedData.cleanType=cleanType
                return removeCleans
              }else {
                formattedData=data
                return addCleans
              }
            }
            funcSelect()(formattedData).then(e=>{
              if (selected.length>1||cell) {
                Promise.all((selected.length>1?selected:[cell]).map(r=>updateHistory(r.getData().respid))).then(e=>{
                  if (selected.length>1) {
                    selected.forEach((r, i) => {
                      r.reformat()
                    });
                  }else {
                    cell.getRow().reformat()
                  }
                  loader.done($(els))
                })
              }else {
                updateHistory().then(e=>{
                  c.getRow().reformat()
                  loader.done($('.tabulator-cell[tabulator-field="'+c.getField()+'"]'))
                })
              }
            }).catch(err=>{
              console.log(err)
              loader.error($(els))
            })
          }
        }
        let getCleanMenu=(labFunc,cell,unmark)=>{
          let cleanMenu=[]
          if ((variable.options||[]).filter(o=>o.hasOtherField).length) {
            cleanMenu.push({label:labFunc("Backcoded"),action:cleanAction("backcoding",cell,unmark)})
          }
          if (variable.variableType=="text") {
            cleanMenu.push({label:labFunc("Spellchecked"),action:cleanAction("spellchecking",cell,unmark)})
            cleanMenu.push({label:labFunc("Coded"),action:cleanAction("coding",cell,unmark)})
          }
          return cleanMenu
        }
        let cellMenu=(e,cell)=>{
          let qname=getTargetQ(variable)
          let selected=editorTable.getSelectedRows()
          // console.log(variable,qname)
          let history=getRowInfo(cell.getData().respid).__rowHistory.filter(h=>h.question==qname && (h.field||"")==((variable.currentField||{}).code||"") && (h.levelPath||"")==(variable.levelPath||""))
          // let changeParams={respid:cell.getData().respid,question:question.originalname||variable.name,field:variable.currentField.code,levelPath:variable.levelPath}
          let getLabel=(txt,isRow)=>{
            let el=isRow?$(cell.getRow().getElement()).find(".tabulator-cell"):cell.getElement()
            if (selected.length>1) {
              el=selected.map(r=>isRow?$(r.getElement()).find(".tabulator-cell"):r.getCell(cell.getField()).getElement())
            }
            let lab=document.createElement("span")
            lab.innerHTML=txt
            $(lab).hover(()=>{
              $(el).addClass("action-indicator")
              let check=setInterval(()=>{
                if (!$(lab).parent().find("*:hover")) {
                  $(el).removeClass("action-indicator")
                  clearInterval(check)
                }
              },200)
            },()=>{
              $(el).removeClass("action-indicator")
            })
            return lab
          }
          let menu=[
            {disabled:true,label:"Last edit: "+(history[0]?(history[0].staffName.split(" ").map(n=>n[0].toUpperCase()).join("")+" "+new Date(history[0].changeDate).toLocaleString("en-GB")):"None")},
            {label:getLabel("Revert to..."),disabled:history.length==0||selected.length>1||!isSyncing,menu:history.map((h,hi)=>{
              let val=JSON.parse(h.oldValue)
              // if (h.field) {
              //   val=val[h.field]
              // }
              if (variable.options) {
                val=isMulti?multiFormatterL(val,showLabels):singleFormatter(val,showLabels)
              }
              val=_.truncate(val)
              let last=history[hi+1]
              let info
              if (last) {
                info=last.staffName.split(" ").map(n=>n[0].toUpperCase()).join("")+" "+(new Date(last.changeDate)).toLocaleString("en-GB")
              }else {
                info="Original "+(new Date(cell.getData().interview_end||cell.getData().lastcomplete)).toLocaleString("en-GB")
              }
              return {label:getLabel(val+" ("+info+")"),action:(e,c)=>{
                isUndo=true
                let loader=cellLoader(cell.getElement())
                undoChanges({changeID:h.changeID,context:{[h.question]:JSON.stringify(col.accessorEdited(cell.getValue(),cell.getData()))}}).then(e=>{
                  cell.setValue(JSON.parse(h.oldValue),false)
                  cell.getRow().update(e)
                  isUndo=false
                  updateHistory(c.getData().respid)
                  loader.done()
                }).catch(err=>{
                  loader.error()
                })
              }}
            })},
            {label:"QC",menu:[
              {label:getLabel("QC check "+(selected.length>1?"selected rows":"row"),true),action:(e,c)=>{
                waitForHistory(()=>{
                  let p=selected.map((selRow, i) => {
                    selRow.getElement().classList.add("row-loading")
                    let qcData=qualityCheck(selRow)
                    return addCleans(qcData.cleanData)
                    // qcData.tableData.map(q=>{
                    //   let tableData=getRowInfo(selRow.getData().respid).__qcChecks
                    //   tableData=tableData.filter(q=>!q.cleanInfo.includes(["straightlining","speeding"])).concat(getRowInfo(q.respid).__qcChecks)
                    //   selRow.update({__qcChecks:tableData}).then(e=>{
                    //     selRow.reformat()
                    //     selRow.getElement().classList.remove("row-loading")
                    //   })
                    // })
                  });
                  Promise.all(p).then(e=>{
                    updateHistory()
                  })
                })

              }},
              {label:getLabel("Flag "+(selected.length>1?"selected cells":"cell")+" for QC"),disabled:variable.isSystemVariable,action:(e,c)=>{
                // console.log(variable,qname)
                if (selected.length>1) {
                  let p=selected.map((selRow, i) => {
                    return addCleans([{respid:selRow.getData().respid,cleanType:"QC",question:"verbatim",cleanInfo:qname}])
                  })
                  Promise.all(p).then(e=>{
                    updateHistory()
                    selected.forEach((row, i) => {
                      row.reformat()
                    });
                  })
                }else {
                  addCleans([{respid:cell.getData().respid,cleanType:"QC",question:"verbatim",cleanInfo:qname}]).then(e=>{
                    updateHistory(cell.getData().respid)
                    cell.getRow().reformat()
                  })
                }
              }},
              {label:getLabel("Remove "+(selected.length>1?"selected rows":"row")+" for QC",true),disabled:cell.getData().LastExtStatus=="51",action:(e,c)=>{
                waitForHistory(()=>qualityRemoval(selected.length>1?selected.map(r=>r.getData()):[cell.getData()]))
              }},
              {label:getLabel("Reinstate "+(selected.length>1?"selected rows":"row"),true),disabled:cell.getData().LastExtStatus!="51",action:(e,c)=>{
                waitForHistory(()=>qualityReinstate(selected.length>1?selected.map(s=>s.getData()):[cell.getData()]))
              }}
            ]},
            {label:getLabel("Mark "+(selected.length>1?"selected cells":"cell")+" as..."),disabled:getCleanMenu(getLabel,cell).length==0,menu:getCleanMenu(getLabel,cell)},
            {label:getLabel("Un-mark "+(selected.length>1?"selected cells":"cell")+" as..."),disabled:getCleanMenu(getLabel,cell,true).length==0,menu:getCleanMenu(getLabel,cell,true)},

          ]
          return menu
        }
        let colMenu=(e,cell)=>{
          e.stopPropagation()
          console.log("menu started")
          if (historyUpdating) {
            return [{label:"Survey history is loading. Try again in a moment.",disabled:true}]
          }
          let qname=getTargetQ(variable)
          let history=editorTable.getData("active").map(r=>getRowInfo(r.respid).__rowHistory).flat(2).filter(h=>h.question==qname && (h.field||"")==((variable.currentField||{}).code||"") && (h.levelPath||"")==(variable.levelPath||""))
          let cleans=editorTable.getData("active").map(r=>getRowInfo(r.respid).__rowCleans).flat(2).filter(h=>h.question==qname && (h.field||"")==((variable.currentField||{}).code||"") && (h.levelPath||"")==(variable.levelPath||""))
          let changeParams={question:qname,field:(variable.currentField||{}).code,levelPath:variable.levelPath}
          let type=""
          console.log("history/cleans mapped")
          let getLabel=(txt)=>{
            let rows=editorTable.getRows("visible")
            let el=cell.getElement()
            if (selected.length>1) {
              el=selected.filter(r=>r.getCell(cell.getField()).getValue()).map(r=>r.getCell(cell.getField()).getElement())
            }else {
              el=rows.filter(r=>r.getCell(cell.getField()).getValue()).map(r=>r.getCell(cell.getField()).getElement())
            }
            let lab=document.createElement("span")
            lab.innerHTML=txt
            $(lab).hover(()=>{
              $(el).addClass("action-indicator")
              let check=setInterval(()=>{
                if (!$(lab).parent().find("*:hover")) {
                  $(el).removeClass("action-indicator")
                  clearInterval(check)
                }
              },200)
            },()=>{
              $(el).removeClass("action-indicator")
            })
            console.log("label created")
            return lab
          }
          let selected=editorTable.getSelectedRows()
          let tableData=(selected.length>1?editorTable.getSelectedRows():editorTable.getRows("active")).map(r=>r.getData()).filter(r=>r[cell.getField()]!==undefined && r[cell.getField()]!==null)
          console.log("cells filtered")
          let menu=[
            {label:"Start "+(variable.isSpecify?"backcoder":"coder"),disabled:variable.variableType!="text"&&!variable.isSpecify,action:(e,col)=>{
              let verb=col.getField()
              let code
              if (variable.isSpecify) {
                code=variable.otherVariable.name+(variable.currentField?"_"+variable.currentField.code:"")
                startCoder(code,verb,true)
              }else {
                let codeVarSel=document.createElement("div")

                $().getModal({
                  title:"Select code variable",
                  body:codeVarSel,
                  maxWidth:"284px",
                  onLoad:(modal)=>{
                    VirtualSelect.init({
                      ele: codeVarSel,
                      hasOptionDescription:true,
                      optionsCount:10,
                      dropboxWidth:"400px",
                      disableOptionGroupCheckbox:true,
                      labelRenderer: data=>{
                        let prefix=''
                        if (data.customData) {
                          prefix='<svg class="forsta-variableIconCont"><use xlink:href="#forsta-variable-'+data.customData.variableType+'"></use></svg>'
                        }
                        return prefix+" "+data.label
                      }
                    });
                    codeVarSel.setOptions(editorTable.getColumns().map(c=>({field:c.getField(),variable:(c.getDefinition().accessorDataParams||{}).variable})).filter(v=>(v.variable||{}).options).map(q=>{
                      return {description:getTitle(q.variable),label:q.field,value:q.field,customData:q.variable}
                    }))
                    codeVarSel.onchange=function(e){
                      if (this.value) {
                        startCoder(this.value,verb)
                        modal.modal("hide")
                      }
                    }
                  }
                })
              }
            }},
            {label:"Toggle line wrap",disabled:variable.variableType!="text"&&!variable.isSpecify,action:(e,col)=>{
              console.log(col,col.getElement(),$(col.getElement()).hasClass("wordWrapCol"))
              if($(col.getElement()).hasClass("wordWrapCol")){
                $(col.getElement()).removeClass("wordWrapCol")
                $(".tabulator-cell[tabulator-field='"+col.getDefinition().field+"']").removeClass("wordWrap")
              }else {
                $(col.getElement()).addClass("wordWrapCol")
                $(".tabulator-cell[tabulator-field='"+col.getDefinition().field+"']").addClass("wordWrap")
              }
              editorTable.getRows("active").forEach(r=>r.normalizeHeight())
              e.stopPropagation()
            }},
            {label:"Edit code(s)",disabled:!variable.options||variable.variableType=="ranking",action:(e,c)=>{
              let opts=variable.options.map(opt=>({value:opt.code,label:getTitle(opt)}))
              opts.push({value:"%na%",label:"Not answered"})
              let getSelector=(multi)=>{
                let sel=document.createElement("div")
                let id="filterWrapper-"+(new Date()).getTime()
                VirtualSelect.init({
                  ele: sel,
                  dropboxWrapper:'body',
                  additionalClasses:id,
                  multiple:multi,
                  markSearchResults:true,
                  setValueAsArray:true,
                  optionsCount:10,
                  emptyValue:null,
                  placeholder:"Select...",
                  dropboxWidth:"200px",
                  labelRenderer: data=>{
                    return data.value+". "+data.label
                  }
                })
                sel.setOptions(opts.map(o=>({...o,...{alias:[o.value.toString()]}})))
                return sel
              }
              let selector=getSelector(true)
              $(selector).tooltip({
                title:"Will replace all selected codes with the one(s) specified in the next box<br>Leave blank to add specified code(s) to all (selected) rows"
              })
              let replacer=getSelector(isMulti)
              let body=document.createElement("div")
              body.append("Replace ",selector," with ",replacer)
              let replaceBtn=document.createElement("button")
              let rowsToUpdate=selected.length?selected:editorTable.getRows("active")
              replaceBtn.classList.add("btn","btn-primary")
              replaceBtn.innerHTML="Update "+(selected.length?"":"all ")+rowsToUpdate.length+" rows"

              $().getModal({
                title:getTitle(variable)+" - Replace codes",
                footer:replaceBtn,
                body:body,
                maxWidth:"700px",
                onLoad:modal=>{
                  $(replaceBtn).click(function(e){
                    if(isSyncing){
                      syncBtn.click()
                    }
                    rowsToUpdate.filter(row=>{
                      let cellVal=row.getCell(c.getField()).getValue()
                      let val=isMulti?(cellVal||[]).true:cellVal
                      let origVal=typeof val ==="string"||val===undefined?[val]:val
                      let selectorVal=selector.value.map(rv=>rv==="%na%"?undefined:rv)
                      return origVal.some(o=>selectorVal.includes(o))||selectorVal.length==0
                    }).forEach(row=>{
                      let cellVal=row.getCell(c.getField()).getValue()
                      let val=isMulti?(cellVal||[]).true:cellVal
                      let origVal=typeof val ==="string"||val===undefined?[val]:val
                      // console.log(selector,selector.value)
                      let selectorVal=selector.value.map(rv=>rv==="%na%"?undefined:rv)
                      let replacerVal=replacer.value.map(rv=>rv==="%na%"?undefined:rv)
                      let n=origVal.filter(o=>!selectorVal.includes(o)).concat(replacerVal)
                      let newVal=_.last(n)
                      if (!_.isEqual(_.sortBy(n), _.sortBy(origVal))) {
                        if (isMulti) {
                          newVal={
                            true:n,
                            false:_.difference(opts.map(o=>o.value),n)
                          }
                        }
                        row.getCell(c.getField()).setValue(newVal)
                      }
                    })
                    if(!isSyncing){
                      syncBtn.click()
                    }
                    modal.modal("hide")
                  })
                }
              })
            }},
            {label:getLabel("Revert all changes"+(selected.length>1?" for selected rows":"")),disabled:history.length==0||!isSyncing,action:(e,c)=>{
              if (confirm("This will take the data for this question back to its original state and any changes will be permanently deleted. Continue?")) {

                isUndo=true
                let els='.tabulator-cell[tabulator-field="'+cell.getField()+'"]'
                if (selected.length>1) {
                  els=selected.map(r=>r.getCell(cell.getField()).getElement())
                }
                let loader=cellLoader($(els))
                changeParams.respid=tableData.map(r=>r.respid).join(",")
                undoChanges(changeParams).then(e=>{
                  editorTable.replaceData().then(e=>{
                    updateHistory()
                    loader.done($(els))
                  })
                }).catch(err=>{
                  console.log(err)
                  loader.error($(els))
                })
              }
            }},
            {label:getLabel("Mark "+(selected.length>1?"selected":"all")+" ("+(tableData.length)+") as..."),disabled:getCleanMenu(getLabel).length==0,menu:getCleanMenu(getLabel)},
            {label:(cell.getDefinition().headerFilterFuncParams||{}).lookupFile?"Remove lookup file":"Filter by lookup file",action:(e,c)=>{
              let params=cell.getDefinition().headerFilterFuncParams||{}
              if (params.lookupFile) {
                editorTable.removeFilter(params.filterFunc)
                delete params.lookupFile
                cell.updateDefinition({headerFilterFuncParams:params})
              }else {
                let input=document.createElement("input")
                input.type="file"
                $(input).attr("accept",".csv").css("display","none")
                $('body').append(input)
                $(input).click()
                const reader = new FileReader();
                reader.addEventListener("load",() => {
                  let respids=reader.result.split(/\r?\n/)
                  let params=cell.getDefinition().headerFilterFuncParams||{}
                  params.lookupFile=respids
                  let filter=d=>respids.includes(d[cell.getDefinition().field].toString())
                  params.filterFunc=filter
                  cell.updateDefinition({headerFilterFuncParams:params}).then(e=>{
                    editorTable.addFilter(filter)
                  })
                },false);
                $(input).on("change",function(e){
                  if (input.files[0]) {
                    reader.readAsText(input.files[0]);
                  }
                })
              }
            }},
          ]
          console.log("menu built")
          return menu
        }

        let col={
          accessor:v=>v,
          visible:!variable.isGrouped,
          mutatorData:getVal,
          mutatorEdited:setVal,
          accessorEdited:(val,data)=>{
            let d=val
            if (variable.currentField) {
              d=(data[variable.name]||{})
              d[variable.currentField.code]=val
              if (val===undefined||val==="") {
                delete d[variable.currentField.code]
              }
            }
            // console.log(JSON.stringify(val),JSON.stringify(d))
            // console.log(variable,variable.currentField,data[variable.name],d)
            return JSON.parse(JSON.stringify(d===undefined?"":d))
          },
          width:150,
          titleFormatter:(c,p,onR)=>{
            onR(()=>{
              let lookup=(c.getColumn().getDefinition().headerFilterFuncParams||{}).lookupFile
              if (lookup) {
                let icon=document.createElement("div")
                icon.innerHTML='<i class="fa-solid fa-file-csv"></i>'
                icon.classList.add("lookupFile-icon")
                icon.title="Lookup file applied ("+lookup.length+" values)"
                $(icon).click(function(e){
                  e.stopPropagation()
                  const blob = new Blob([lookup.join("\r\n")], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.setAttribute('href', url)
                  a.setAttribute('download', c.getValue()+' lookup file.csv');
                  a.click()
                })
                c.getElement().append(icon)
              }
            })
            return c.getValue()
          },
          headerFilter:"input",
          headerFilterParams:{search:true},
          headerFilterFunc:(h,r,d,p)=>{
            h=h===undefined?"":h.toString().toLowerCase()
            r=r===undefined?"":r.toString().toLowerCase()
            let res=(r!=="" && r.indexOf(h)>-1)||h===""
            return res
          },
          headerFilterPlaceholder:"Filter...",
          contextMenu:cellMenu,
          valFormatter:c=>c.getValue()===undefined||c.getValue()===null?"":c.getValue(),
          headerContextMenu:colMenu,
          field:(variable.isSpecify?variable.otherVariable.name+".":"")+variable.name+(variable.currentField?"#"+variable.currentField.code:""),
          title:(variable.isSpecify?variable.otherVariable.name+".":"")+variable.name+(variable.currentField?"_"+variable.currentField.code:""),
          headerTooltip:getTitle(variable)+(variable.currentField?" - "+getTitle(variable.currentField):"")
        }
        col.accessorDataParams={variable:variable,accessorEdited:col.accessorEdited}
        if (!variable.isSystemVariable) {
          if (variable.variableType=="numeric"||variable.variableType=="ranking") {
            col.editor="number"
            col.headerFilterFunc=(h,r,d,p)=>{
              let ev=h.toLowerCase()
              if (h!==undefined) {
                ev=ev.replaceAll("and","&&")
                ev=ev.replaceAll("or","||")
                ev=ev.match(/(&&)|(\|\|)|(\<[^\=])|(\>[^\=])|(\<\=)|(\>\=)|(\=\=)| |[0-9]|[xX]/g).join("")
                ev=ev.replaceAll(/[xX]/g,r)
              }
              let res=h===""?true:(r===undefined?false:eval(ev))
              return res
            }
          }else {
            col.editor="input"
          }
        }
        if (variable.options && variable.variableType!="ranking") {
          col.valFormatter=c=>{
            return isMulti?multiFormatterL(c.getValue(),showLabels):singleFormatter(c.getValue(),showLabels)
          }
          col.editor=listEditor
          col.headerFilter=listFilter
          col.headerFilterFunc=(h,r,d,p)=>{
            let ret=true
            let type=h.type
            let hval=h.value
            hval=hval.map(v=>v=="%na%"?undefined:v)
            let rval=typeof r==="string"||r===undefined?[r]:((r||{}).true||[])
            let comparison={
              "all":()=>hval.every(v=>rval.includes(v)),
              "any":()=>hval.some(v=>rval.includes(v)),
              "none":()=>!hval.some(v=>rval.includes(v)),
              "exact":()=>_.isEqual(_.sortBy(hval), _.sortBy(rval)),
            }
            if (hval.length) {
              ret=comparison[type]()
            }
            return ret
          }
          let opts=variable.options.map(opt=>({value:opt.code,label:getTitle(opt)}))
          opts.push({value:"%na%",label:"Not answered"})
          col.editorParams={
            values:opts,
            multiSelect:isMulti
          }
          col.headerFilterParams={
            values:opts,
            multiSelect:isMulti
          }
          if (isMulti) {
            col.accessor=(v,d)=>{
              let v2=v
              if ((v2||{}).true) {
                v2=v2.true
              }
              let obj={
                true:v2,
                false:_.difference(variable.options.map(o=>o.code),v2)
              }
              return isMulti?obj:v
            }
            // col.linkedMutators=[]
          }
        }else if (variable.variableType=="ranking") {
          col.valFormatter=c=>singleFormatter(c.getValue())
          // col.accessor=(v,d)=>{
          //   let obj=d[variable.name]
          //   obj[variable.currentField.code]=v
          //   return obj
          // }
        }
        if(variable.isSpecify) {
          col.mutatorData=(v,d)=>getSpecifyData(d,variable)
          col.mutatorEdited=c=>setSpecifyData(c,variable)
          if (variable.variableType=="multiGrid") {
            col.accessor=(v,d)=>{
              let obj={}
              obj[variable.name]=v
              return obj
            }
          }
        }
        col.formatter=(c,p,onR)=>{
          let iconCont=document.createElement("span")
          let val=col.valFormatter(c)
          if (variable.name=="respid" && (c.getData().lastchannel||1)==1) {
            let flagCont=document.createElement("span")
            let flagT=document.createElement("span")
            $(flagT).css({
              margin: '0px 2px',
            })
            $(iconCont).css({
              display: 'flex',
              position: 'absolute',
              'font-size': '10px',
              top: "0px",
              'flex-wrap': 'nowrap',
              'color':'gainsboro'
            })
            let types=["speeding","straightlining","verbatim","illogical"]
            let icons=types.map((type, i) => {
              let flagI=$(flagT).clone(true)
              flagI.html('<i class="fa-solid fa-flag"></i>').attr("title",type+" check not done").attr("data-type",type)
              iconCont.append(flagI[0])
              return flagI[0]
            });
            waitForHistory(()=>{
              let qChecks=(getRowInfo(c.getData().respid).__qcChecks||[]).filter(h=>h.cleanType=="QC")
              icons.forEach((flagIcon, i) => {
                let type=$(flagIcon).attr("data-type")
                let flag=qChecks.find(c=>c.question==type)
                if (flag) {
                  if (flag.cleanInfo=="pass") {
                    $(flagIcon).css("color","rgb(61 223 61)").attr("title","passed "+type+" check")
                  }else {
                    $(flagIcon).css("color","rgb(231 94 94)").attr("title","failed "+type+" check"+(flag.cleanInfo=="fail"?"":" ("+flag.cleanInfo+")"))
                  }
                }
              });
            })
          }else if(c.getValue()!==undefined) {
            let iconT=document.createElement("span")
            $(iconCont).css({
              display: 'flex',
              position: 'absolute',
              'font-size': '10px',
              top: "0px",
              width: '22px',
              'flex-wrap': 'nowrap',
              'color':'gainsboro'
            })
            let qname=getTargetQ(variable)
            let types=variable.hasOthers?["backcoding"]:variable.isSpecify?["spellchecking"]:variable.variableType=="text"?["spellchecking","coding"]:[]

            let icons=types.map((type, i) => {
              let icon=$(iconT).clone(true)
              icon.html('<i class="fa-solid fa-check"></i>').attr("title",type+" not done").attr("data-type",type)
              iconCont.append(icon[0])
              return icon[0]
            });
            waitForHistory(()=>{
              let qCleans=(getRowInfo(c.getData().respid).__rowCleans||[]).filter(h=>h.question==qname && (h.field||"")==((variable.currentField||{}).code||"") && (h.levelPath||"")==(variable.levelPath||""))
              icons.forEach((tickIcon, i) => {
                let icon=$(tickIcon)
                let type=icon.attr("data-type")
                if (!!qCleans.find(r=>r.cleanType==type)) {
                  icon.css("color","rgb(61 223 61)").attr("title",type+" done")
                }
              });
            })
            onR(()=>{
              if ($(c.getColumn().getElement()).hasClass("wordWrapCol")) {
                $(c.getElement()).addClass("wordWrap")
              }else {
                $(c.getElement()).removeClass("wordWrap")
              }
              c.getRow().normalizeHeight()
            })
          }
          let valEl=document.createElement("span")
          valEl.innerHTML=val
          valEl.append(iconCont)
          return valEl
        }
        col.cellEdited=c=>{
          if (!isUndo) {
            if (c.getValue() || c.getOldValue()!==undefined) {
              $(c.getRow().getElement()).addClass("row-loading")
              let dots=getLoadingDots({css:{right:'unset',left:'0',bottom:'3px',"font-size":"5px"}})
              $(c.getElement()).append(dots)
              $(c.getElement()).css({"pointer-events":"none","background":""})
              let obj={respid:c.getData().respid}
              // console.log(c.getValue(),c.getOldValue(),col.accessor(c.getValue(),c.getData()))
              obj[getTargetQ(variable)]={
                new:col.accessorEdited(c.getValue(),c.getData()),
                old:col.accessorEdited(c.getOldValue(),c.getData()),
                // new:c.getValue()!==undefined?col.accessor(c.getValue(),c.getData()):"",
                // old:c.getOldValue()!==undefined?col.accessor(c.getOldValue(),c.getData()):"",
                field:(variable.currentField||{}).code,
                levelPath:variable.levelPath||""
              }
              let loader=cellLoader(c.getElement())
              // if (col.mutatorEdited){
              //   col.mutatorEdited(c)
              // }
              console.log(JSON.parse(JSON.stringify(obj)))
              updateBatchData([obj],getTargetQ(variable)).then(e=>{
                if (isSyncing) {
                  updateHistory(c.getData().respid)
                }
                $(c.getRow().getElement()).removeClass("row-loading")
                loader.done(c.getElement())
              }).catch(err=>{
                $(c.getRow().getElement()).removeClass("row-loading")
                loader.error(c.getElement())
              })
            }
          }
          isUndo=false
        }
        return col
      }
    }
    let mapSchema=schema=>{
      function moveQ(colName, toIndex) {
        var fromIndex = schema.findIndex(s=>s.name==colName);
        if (fromIndex>-1) {
          let element=schema[fromIndex]
          schema.splice(fromIndex, 1);
          schema.splice(toIndex, 0, element);
        }
      }
      moveQ("status",1)
      moveQ("LastExtStatus",2)
      let newSchema=[]
      let addSpecifies=(q,field)=>{
        (q.options||[]).filter(o=>o.hasOtherField).forEach((opt, i) => {
          let oq=JSON.parse(JSON.stringify(q))
          delete oq.options
          q.hasOthers=true
          oq.isSpecify=true
          oq.otherVariable=q
          oq.otherCode=opt.code
          oq.name=field && q.variableType=="singleChoice"?field.code+"$other":opt.code+"$other"
          newSchema.push(oq)
        });
      }
      schema.filter(q=>(!q.isSystemVariable||q.name=="respid"||q.name=="status")&&q.name!="QC_summary"&&q.name!="FinalLOI"&&q.name!="LastAgentName").forEach((question, i) => {
        if (question.fields) {
          question.fields.forEach((field, i) => {
            let fq=JSON.parse(JSON.stringify(question))
            fq.currentField=field
            newSchema.push(fq)
            addSpecifies(fq,field)
          });
        }else {
          newSchema.push(question)
          addSpecifies(question)
        }
      });
      let fieldsGrouped=[]
      newSchema.forEach((question, i) => {
        if (question.currentField) {
          question.isGrouped=true
          let gi=fieldsGrouped.findIndex(g=>g.isGroup && g.name==question.name)
          if (gi>=0) {
            fieldsGrouped[gi].columns.push(question)
          }else {
            fieldsGrouped.push({isGroup:true,levelPath:question.levelPath,columns:[question],name:question.name})
          }
        }else {
          fieldsGrouped.push(question)
        }
      });
      let loopsGrouped=[]
      fieldsGrouped.forEach((question, i) => {
        let depth=1
        let addLevels=(tempLevel)=>{
          console.log("adding level",depth,Object.keys(question.levelPath)[depth])
          if (Object.keys(question.levelPath)[depth]) {
            let ci=tempLevel.columns.findIndex(c=>c.isGroup && c.name==Object.keys(question.levelPath[depth])[0])
            if (ci>=0) {
              console.log("found another level",Object.keys(question.levelPath[depth])[0])
              depth++
              addLevels(tempLevel.columns[ci])
            }else {
              console.log("final depth, adding group",Object.keys(question.levelPath[depth])[0])
              tempLevel.columns.push({isGroup:true,isGrouped:true,columns:[],name:Object.keys(question.levelPath[depth])[0]})
              depth++
              addLevels(tempLevel.columns[tempLevel.columns.length-1])
            }
          }else {
            console.log("final depth, adding column")
            question.isGrouped=true
            tempLevel.columns.push(question)
          }
        }
        console.log("loop grouping",question)
        if (question.levelPath) {
          let ci=loopsGrouped.findIndex(c=>c.isGroup && c.name==Object.keys(question.levelPath[0])[0])
          if (ci>=0) {
            console.log("found loop",Object.keys(question.levelPath[0])[0])
            addLevels(loopsGrouped[ci])
          }else {
            console.log("new loop",Object.keys(question.levelPath[0])[0])
            loopsGrouped.push({isGroup:true,columns:[],name:Object.keys(question.levelPath[0])[0]})
            addLevels(loopsGrouped[loopsGrouped.length-1])
          }
        }else {
          console.log("not in loop")
          loopsGrouped.push(question)
        }
      });
      let defCols=[
        {width:30,download:false,formatter:"rowSelection", titleFormatter:"rowSelection", titleFormatterParams:{
            rowRange:"active" //only toggle the values of the active filtered rows
        }, hozAlign:"center", headerSort:false,frozen:true},
      ]
      let systemCols=[
        {name:"Info",isInfoCol:true,isGroup:true,columns:[
          {field:"isHistoryUpdating",visible:false,mutateLink:["lastChange","__rowHistory","qcRemovalDate"]},
          {title:"Last edited",visible:false,field:"lastChange",mutator:(v,d)=>{
            // console.log("mutating Last edited: "+d.respid,getRowInfo(d.respid))
            return Math.max(...(getRowInfo(d.respid).__rowHistory||[]).map((h) => (new Date(h.changeDate)).getTime()))
          },formatter:c=>{
            // console.log("formatting Last edited: "+c.getValue())
            return historyUpdating?"":Math.abs(c.getValue())!==Infinity&&c.getValue()?(new Date(c.getValue())).toLocaleString("en-GB"):"Never"
          }},
          {title:"Edits",field:"__rowHistory",visible:false,mutator:(v,d)=>{
            return getRowInfo(d.respid).__rowHistory
          },formatter:c=>{
            return historyUpdating?"":(c.getValue()||[]).length
          }},
          {title:"QC removal",visible:false,field:"qcRemovalDate",mutator:(v,d)=>{
            let his=((getRowInfo(d.respid).__rowHistory||[]).find(h=>h.question=="status")||{})
            return JSON.parse(his.oldValue||null)=="complete"?his.changeDate:null
          },formatter:c=>{
            return historyUpdating?"":c.getValue()?(new Date(c.getValue())).toLocaleString("en-GB"):"Never"
          }},
          {title:"Method",visible:false,field:"lastchannel",formatter:c=>c.getValue()?getTitle(schema.find(q=>q.name=="lastchannel").options.find(o=>o.code==c.getValue())):""},
          {title:"LOI (m)",visible:false,field:"loi",mutator:(v,d)=>getDuration(d),formatter:c=>c.getValue()?Math.round(c.getValue()*10)/10:""},
          {title:"Agent",visible:false,field:"LastAgentName"}
        ]}
      ]
      console.log(schema,newSchema,loopsGrouped,defCols)
      return defCols.concat(systemCols.concat(loopsGrouped).map(q=>getCol(q)))
    }
    let container=document.createElement("div")
    let tableHolder=document.createElement("div")
    let editorTable
    let createToolbar=(menu)=>{
      let toolbar=document.createElement("div")
      toolbar.id="toolbar-"+(new Date()).getTime()
      $(toolbar).css({
        display: 'flex',
        'flex-wrap': 'wrap',
        width: '100%',
        margin: '9px 2px',
        background: 'white',
        padding: '5px 0px',
      }).addClass("fd-toolbar")
      function addButton(item,isSub){
        let topLevel=document.createElement("div")
        let btn=document.createElement("div")
        btn.setAttribute("data-name",item.label)
        topLevel.append(btn)
        $(btn).css({
          padding: '2px 20px 2px 13px',
          'border-bottom': isSub?'1px solid var(--subtle)':'2px solid var(--secondary)',
          // background: 'white',
          position: 'relative',
          transition: '0.3s all',
          width: isSub?'160px':'80px',
          // margin: '0px 10px',
          cursor: 'pointer',
        }).addClass("fd-toolbar-btn")
        if ((typeof item.disabled === 'function'?item.disabled():item.disabled)) {
          $(btn).css({
            color: 'darkgray',
            'pointer-events':'none'
          })
        }
        btn.innerHTML=item.label
        if (item.menu) {
          let arrow=document.createElement("span")
          $(arrow).css({
            padding: '0px 3px',
            color: 'gainsboro',
            position: 'absolute',
            right: '4px',
          })
          arrow.innerHTML=isSub?'<i class="fa-solid fa-caret-right"></i>':'<i class="fa-solid fa-caret-down"></i>'
          btn.append(arrow)
          $(btn).click(function(){
            $(btn).parent().parent().find('.fd-toolbar-sub').remove()
            let sub=document.createElement("div")
            $(sub).css({
              transform: isSub?'translateX(102%) translateY(-29px)':'translateY(0px) translateX(3px)',
              position:'absolute',
              'box-shadow':'0 0 5px 0 rgba(0,0,0,.2)',
              background:"white",
              opacity:0,
              transition: '0.3s all',
              'z-index':3
            }).addClass("fd-toolbar-sub")
            if ($(sub).find("div").length) {
              $(sub).remove()
            }else {
              topLevel.append(sub)
              if (typeof item.menu=="function") {
                $(sub).loader()
                item.menu(arr=>{
                  $(sub).loader("done")
                  arr.forEach((subitem, i) => {
                    sub.append(addButton(subitem,true))
                  });
                })
              }else {
                item.menu.forEach((subitem, i) => {
                  sub.append(addButton(subitem,true))
                });
              }
              $(sub).css("opacity",1)
            }
          })
        }
        if (item.action) {
          $(btn).click(function(e){
            item.action()
            $('.fd-toolbar-sub').remove()
          })
        }
        if (item.actionChange) {
          $(btn).find("input").change(function(e){
            item.actionChange($(this).val())
            $('.fd-toolbar-sub').remove()
          })
        }
        $(document).click(function(e){
          if ($(e.target).closest('.fd-toolbar-btn').length==0) {
            $('.fd-toolbar-sub').remove()
          }
        })
        return topLevel
      }
      menu.forEach((item, i) => {
        toolbar.append(addButton(item))
      });
      return toolbar
    }
    function exportToWord(unchecked){
      waitForHistory(()=>{
        let data=[]
        editorTable.getRows("active").filter(r=>!unchecked||!(getRowInfo(r.getData().respid).__rowCleans||[]).find(c=>c.cleanType=="spellchecking")).forEach((row, i) => {
          let obj={respid:row.getIndex()}
          editorTable.getColumns().map(c=>c.getDefinition()).filter(c=>c.accessorDataParams).forEach((col, i) => {
            let variable=col.accessorDataParams.variable
            if (variable.isSpecify||variable.variableType=="text") {
              data.push({
                respid:row.getIndex(),
                question:getTargetQ(variable),
                text:row.getData()[col.field],
                field:((variable.currentField||{}).code||""),
                levelPath:(variable.levelPath||""),
                tableCell:col.field,
              })
            }
          })
        });
        if (data.filter(d=>d.text).length) {
          $.ajax({
            url:"/verbatims-to-word",
            method:"POST",
            data:{
              data:data.filter(d=>d.text).sort((a,b)=>a.text.localeCompare(b.text)),
              pid:settings.pid
            },
            success: function (response) {
              // var source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(response);
              var fileDownload = document.createElement("a");
              document.body.appendChild(fileDownload);
              fileDownload.href = response;
              fileDownload.click();
              document.body.removeChild(fileDownload);
            },
          })
          globalSocket.emitUpdate("Collecting verbatim data")
        }else {
          alert("No verbatims to clean!")
        }
      })
    }
    let menu=[
      // {label:"Sync "}
      {label:"File",menu:[
        {label:"Open survey",action:()=>{
          function open(){
            destroyEditor()
            $().forstaSurveySelector({
              onSelected:pid=>{
                $(container).forstaVariableSelector({hideOptions:true,goText:"View data",pid:pid,goValidation:data=>{
                  let ret=true
                  if (data.variables.length>10) {
                    if (!confirm("Selecting this many variables may cause slow performance. Continue anyway?")) {
                      ret=false
                    }
                  }
                  return ret
                },goFunction:vars=>{
                  container.remove(true)
                  editor=$(settings.el).forstaDataEditor({pid:pid,variables:vars.variables,completesFilter:vars.completesFilter})
                }})
              }
            })
          }
          if (dataToSync.length) {
            if(confirm("You have "+dataToSync.length+" changes not yet synced to Forsta. If you continue, these changes will be lost. Continue?")){
              open()
            }
          }else {
            open()
          }
        }},
        {label:"Load variables",disabled:!settings.pid,action:()=>{
          function open(){
            let variables=JSON.parse(JSON.stringify(settings.variables))
            destroyEditor()
            $(container).forstaVariableSelector({goText:"View data",hideOptions:true,variables:variables,pid:settings.pid,goFunction:vars=>{
              container.remove(true)
              editor=$(".editor").forstaDataEditor({pid:settings.pid,variables:vars.variables,completesFilter:vars.completesFilter})
            }})
          }
          if (dataToSync.length) {
            if(confirm("You have "+dataToSync.length+" changes not yet synced to Forsta. If you continue, these changes will be lost. Continue?")){
              open()
            }
          }else {
            open()
          }
        }},
        {label:"Import",disabled:!settings.pid,menu:[
          {label:"From Word",action:()=>{
            let input=document.createElement("input")
            input.type="file"
            $(input).attr("accept",".doc,.docx,application/msword,.htm,.html").css("display","none")
            $('body').append(input)
            $(input).click()
            $(input).on("change",function(e){
              var formData = new FormData();
              formData.append("wordDoc", input.files[0]);
              $.ajax({
                url: '/verbatims-from-word/',
                type: 'POST',
                // global:false,
                processData: false,
                contentType: false,
                data:formData,
                error:(e)=>{
                  alert("An error occurred. Contact the system administrator")
                },
                success: function (response) {
                  if (response.pid!=settings.pid) {
                    alert("Could not process the file. Ensure it is for this project")
                  }else {
                    $("body").addClass("loading")
                    let missing={
                      respids:[],
                      questions:[]
                    }
                    console.log(response.data)
                    let updateData=response.data.map(r=>{
                      let row=editorTable.getRow(r.metadata.split("|")[0])
                      let old
                      let newVal
                      if (row) {
                        let cell=row.getCell(r.metadata.split("|")[4])
                        if (cell) {
                          let accessorEdited=cell.getColumn().getDefinition().accessorDataParams.accessorEdited
                          old=accessorEdited(cell.getValue(),cell.getData())
                          newVal=accessorEdited(r.text,cell.getData())
                        }else {
                          missing.questions.push(r.metadata.split("|")[4])
                          return {}
                        }
                      }else {
                        missing.respids.push(r.metadata.split("|")[0])
                        return {}
                      }
                      return {
                        respid:r.metadata.split("|")[0],
                        [r.metadata.split("|")[1]]:{
                          new:(newVal||""),
                          old:old||"",
                          field:(r.metadata.split("|")[2]||""),
                          levelPath:(r.metadata.split("|")[3]||"")
                        }
                      }
                    })
                    missing.respids=_.uniq(missing.respids)
                    missing.questions=_.uniq(missing.questions)
                    console.log("MISSING",missing)
                    function checkMissing(type,typeTxt){
                      return new Promise(res=>{
                        if (missing[type].length) {
                          let footer=document.createElement("div")
                          let cancel=document.createElement("button")
                          cancel.innerHTML="Cancel"
                          cancel.classList.add("btn","btn-white")
                          let contin=document.createElement("button")
                          contin.innerHTML="Continue anyway"
                          contin.classList.add("btn","btn-primary")
                          footer.append(contin,cancel)
                          $().getModal({
                            title:"Missing "+(typeTxt||type),
                            body:"There are "+(typeTxt||type)+" present in the document that are not present in the loaded data, so will not get updated<br><br><div style='max-height:400px;overflow-y:scroll'>"+missing[type].join("<br>")+"</div>",
                            footer:footer,
                            onLoad:modal=>{
                              cancel.onclick=function(e){
                                modal.modal("hide")
                              }
                              contin.onclick=function(e){
                                res()
                                modal.modal("hide")
                              }
                            }
                          })
                        }else {
                          res()
                        }
                      })
                    }
                    checkMissing("respids","interviews").then(e=>{
                      checkMissing("questions").then(e=>{
                        addCleans(response.data.filter(r=>updateData.find(u=>u.respid==r.metadata.split("|")[0])).map(r=>({
                          respid:r.metadata.split("|")[0],
                          cleanType:"spellchecking",
                          question:r.metadata.split("|")[1],
                          field:(r.metadata.split("|")[2]||""),
                          levelPath:(r.metadata.split("|")[3]||""),
                          cleanInfo:"Word upload ("+input.files[0].name+")"
                        })))
                        $(tableHolder).loader()
                        updateBatchData(updateData.filter(el=>el),..._.uniq(response.data.map(r=>r.metadata.split("|")[1]))).then(e=>{
                          $(tableHolder).loader("done")
                          alert(updateData.filter(el=>el).length+" verbatims updated in "+_.uniq(response.data.map(r=>r.metadata.split("|")[0])).length+" interviews, across "+_.uniq(response.data.map(r=>r.metadata.split("|")[1])).length+" questions")
                          editorTable.redraw(true)
                        })
                      })
                    })
                    // console.log(updateData)
                  }
                }
              })
            })
          }},
          {label:"From Excel",disabled:true,action:()=>{
            let input=document.createElement("input")
            input.type="file"
            $(input).attr("accept",".xlsx, .xls").css("display","none")
            $('body').append(input)
            $(input).click()
            $(input).on("change",function(e){
              var formData = new FormData();
              formData.append("dataFile", input.files[0]);
              formData.append("requiredCols", ["respid",currentQuestion]);
              $.ajax({
                url: '/excel-to-json/',
                type: 'POST',
                global:false,
                processData: false,
                contentType: false,
                data:formData,
                success: function (response) {
                  let currData=verbTable.getData()
                  updateBatchData(response.data.map(r=>{
                    Object.keys(r).forEach((item, i) => {
                      if (r[k].metadata) {
                        r[k].new=r[k].val
                        r[k].old=(editorTable.getRow(r.respid)||{}).getCell(r.metadata.tableField).getValue()
                        r[k].field=r.metadata.field
                        r[k].levelPath=r.metadata.levelPath
                        delete r[k].metadata
                      }
                    });
                    return r
                  }).filter(el=>el.old!==undefined),..._.uniq(response.data.map(r=>Object.keys(r)).flat(2).filter(el=>el!="respid")))
                },
                error: function (jqXHR, exception) {
                  alert(getErrorMessage(jqXHR, exception))
                }
              })
            })
          }},
        ]},
        {label:"Export",disabled:!settings.pid,menu:[
          {label:"To Word",menu:[
            {label:"All verbatim",action:()=>{
              exportToWord()
            }},
            {label:"Unchecked verbatim only",action:()=>{
              exportToWord(true)
            }},
          ]},
          {label:"To Excel",disabled:true,menu:[
            {label:"All questions",action:()=>{}},
          ]},
          {label:"Survey data",menu:[
            {label:"Excel data",action:()=>{
              $(container).forstaVariableSelector({goFunction:'data',goText:"Download data",pid:settings.pid})
            }},
            {label:"Toplines",action:()=>{
              $(container).forstaVariableSelector({goFunction:'toplines',goText:"Download toplines",pid:settings.pid})
            }},
          ]}
        ]},
        {label:"View change log",disabled:!settings.pid,action:()=>{
          $(container).loader()
          updateHistory(null,true).then(changes=>{
            let div=document.createElement("div")
            let table=new Tabulator(div,{
              data:changes,
              height:"700px",
              columnDefaults:{
                headerSort:true,
                // headerFilter:true,
              },
              initialSort:[
                {column:"dte",dir:"desc"}
              ],
              columns:[
                {field:"type",title:"Type",mutator:(v,d)=>d.cleanType?"Clean/Check":"Edit"},
                {field:"dte",title:"Date",mutator:(v,d)=>(d.cleanDate||d.changeDate),formatter:c=>(new Date(c.getValue())).toLocaleString("en-GB")},
                {field:"staffName",title:"Editor"},
                {field:"respid",title:"respid"},
                {field:"question",title:"Question"},
                {field:"gridLoop",title:"Loop/grid item",mutator:(v,d)=>(d.levelPath||[]).map(lev=>Object.keys(lev)[0]+":"+Object.values(lev)[0]).join(" ")+(d.field?" "+d.field:"") },
                {field:"oldValue",title:"Old value",mutator:v=>v===null||v===undefined?"":JSON.parse(v),formatter:c=>c.getValue()?((c.getValue().true?c.getValue().true.join(","):null)||c.getValue()):""},
                {field:"newValue",title:"New value",mutator:v=>v===null||v===undefined?"":JSON.parse(v),formatter:c=>c.getValue()?((c.getValue().true?c.getValue().true.join(","):null)||c.getValue()):""},
                {field:"cleanType",title:"Clean"},
                {field:"cleanInfo",title:"Clean info"},
              ]
            })
            $().getModal({
              title:"Change log",
              body:div,
              maxWidth:"80%",
              onLoad:()=>$(container).loader("done")
            })
          })
        }}
      ]},
      {label:"Tools",disabled:!settings.pid,menu:[
        {label:"QC",disabled:()=>!settings.pid,menu:[
          {label:"Run QC check",disabled:()=>(settings.pid&&editorTable)?editorTable.getData("active").filter(r=>(r.lastchannel||1)==1).length==0:true,action:()=>{
            waitForHistory(()=>{
              let qcData=qualityCheck()
              addCleans(qcData.cleanData).then(e=>updateHistory())
              })
            }
          },
          {label:"Remove for QC",menu:[
            {label:"Where 2+ flags",action:()=>{
              waitForHistory(()=>{
                let tableData=editorTable.getData("active").filter(r=>getRowInfo(r.respid).__qcChecks.filter(q=>q.cleanInfo!="pass").length>1)
                qualityRemoval(tableData).then(e=>{
                  alert(tableData.length+" removed for QC")
                })
              })
            }},
            {label:"Where X+ flags",menu:[
              {label:"<input type='number' step='1' style='width:127px;font-size:12px'>",actionChange:(val)=>{
                waitForHistory(()=>{
                  let tableData=editorTable.getData("active").filter(r=>getRowInfo(r.respid).__qcChecks.filter(q=>q.cleanInfo!="pass").length>=val)
                  qualityRemoval(tableData).then(e=>{
                    alert(tableData.length+" removed for QC")
                  })
                })
              }}
            ]}
          ]},
          {label:"Reinstate all QC removals",disabled:()=>editorTable.getData("active").filter(r=>r.LastExtStatus=="51").length,action:()=>{
            let data=editorTable.getData("active").filter(r=>r.LastExtStatus=="51")
            qualityReinstate(data)
          }},
        ]},
        {label:"Undo changes",disabled:()=>!isSyncing,menu:[
          {label:"All changes",action:(e,c)=>{
            if (confirm("This will undo all changes to the loaded variables and is not reversible. Continue?")) {
              isUndo=true
              undoChanges({question:settings.variables.join(",")}).then(e=>{
                isUndo=false
                editorTable.setData().then(e=>{
                  updateHistory()
                })
              })
            }
          }},
          {label:"Revert to date",disabled:()=>!isSyncing,menu:[
            {label:"<input type='datetime-local' style='width:127px;font-size:12px'>",actionChange:(val)=>{
              if (confirm("This will undo all changes to the loaded variables made after "+moment(val+":00").format("DD/MM/YYYY HH:mm")+", and is not reversible. Continue?")) {
                isUndo=true
                undoChanges({changeDate:val+":00",question:settings.variables.join(",")}).then(e=>{
                  isUndo=false
                  editorTable.setData().then(e=>{
                    updateHistory()
                  })
                })
              }
            }}
          ]}
        ]},
        {label:"Quotas",disabled:()=>!settings.pid,menu:[
          {label:"Synchronise all quotas",action:()=>{
            $.ajax({method:"post",url:"/forsta-quotas?pid="+settings.pid,data:{}})
          }},
          {label:"View/edit quotas",action:()=>{
            let quotaCont=document.createElement("div")
            let updateAllBtn=document.createElement("button")
            updateAllBtn.classList.add("btn","btn-primary")
            updateAllBtn.innerHTML="Update & sync all"
            $().getModal({
              title:"Quotas",
              body:quotaCont,
              maxWidth:"1000px",
              footer:updateAllBtn,
              onLoad:()=>{
                let quotaTable=new Tabulator(quotaCont,{
                  groupBy:"quotaName",
                  height:"60vh",
                  groupStartOpen:false,
                  ajaxURL:"/forsta-quotas?pid="+settings.pid,
                  columns:[
                    {title:"Quota",field:"quotaName",visible:false},
                    {title:"Cell",field:"fieldName"},
                    {title:"Target",field:"limit",editor:"number"},
                    {title:"Complete",field:"counter"},
                    {title:"To do",field:"todo",mutator:(v,d)=>d.limit-d.counter},
                    {title:"",formatter:c=>{
                      let btn=document.createElement("button")
                      btn.classList.add("btn","btn-sm","btn-primary")
                      btn.innerHTML="Update & sync"
                      $(btn).click(function(e){
                        $.ajax({method:"post",url:"/forsta-quotas?pid="+settings.pid,data:{
                          quotas:[
                            {name:c.getData().quotaName,data:[{
                              id:c.getData().id,
                              limit:c.getData().limit
                            }]}]
                          }
                        }).done(e=>{
                          quotaTable.setData()
                        })
                      })
                      return btn
                    }}
                  ]
                })
                $(updateAllBtn).click(function(e){
                  $.ajax({method:"post",url:"/forsta-quotas?pid="+settings.pid,data:{}}).done(e=>{
                    quotaTable.setData()
                  })
                })
              }
            })
          }}
        ]},
        {label:"Backcoder",action:()=>{
          let specifies=editorTable.getColumns().filter((col, i) => {
            let def=col.getDefinition()
            // console.log(col,def)
            return def.accessorDataParams?def.accessorDataParams.variable.isSpecify:false
          })
          if (specifies.length==0) {
            alert("No backcoding to do")
          }
          let b=0
          function backcode(){
            // console.log(specifies,b,specifies[b])
            if (b<specifies.length) {
              let verb=specifies[b].getField()
              let def=specifies[b].getDefinition()
              let variable=def.accessorDataParams.variable
              let code=variable.otherVariable.name+(variable.currentField?"_"+variable.currentField.code:"")
              startCoder(code,verb,true,()=>{
                b++
                backcode()
              })
            }
          }
          backcode()
        }}
      ]},
      {label:"View",disabled:!settings.pid,menu:[
        {label:"Toggle codes/labels",action:()=>{
          showLabels=!showLabels
          editorTable.redraw(true)
        }},
        // {label:"Show/hide QC removals",action:()=>{
        //   if (editorTable.getFilters().find(f=>f.field=="status")) {
        //     settings.completesFilter="("+settings.completesFilter+") OR selected(response:LastExtStatus,'51')"
        //     editorTable.setData().then(e=>{
        //       editorTable.clearFilter()
        //     })
        //   }else {
        //     settings.completesFilter="response:status='complete'"
        //     editorTable.addFilter("status","=","complete")
        //   }
        // }}
      ]}
    ]
    let toolbar=createToolbar(menu)
    let syncCont=document.createElement("div")
    let syncBtn=document.createElement("button")
    $(syncCont).css({
      position:"relative",
      width:"fit-content"
    })
    let syncInfo=document.createElement("span")
    syncCont.append(syncBtn,syncInfo)
    $(syncInfo).css({
      display:'none',
      position:"absolute",
      top:0,
      right:"-5px",
      background:"red",
      color:"white",
      "border-radius":"50%",
      width:"15px",
      height:"15px",
      "font-size":"9px",
      "text-align":"center"
    })

    let dataToSync=[]
    syncBtn.classList.add("btn","btn-white")
    syncBtn.innerHTML="Sync ON"
    syncBtn.onclick=function(e){
      if (codeFrameAlert.style.display!="none") {
        codeFrameAlert.click()
      }else {
        if ($(container).find(".coder")) {
          $(".coder").remove()
          $(".coderBackdrop").remove()
        }
        isSyncing=!isSyncing
        syncBtn.innerHTML=isSyncing?"Sync ON":"Sync PAUSED"
        if (isSyncing&&dataToSync.length) {
          $("body").addClass("loading")
          updateBatchData([]).then(e=>{
            if (e.length<10) {
              $("body").removeClass("loading")
              let p=e.map((d, i) => {
                let row=editorTable.getRow(d.respid)
                row.getElement().classList.add("row-loading")
                return row.update(d)
              });
              Promise.all(p).then(e=>{
                $(".row-loading").removeClass("row-loading")
                editorTable.refreshFilter()
              })
            }else {
              editorTable.updateData(e).then(e=>{
                editorTable.redraw(true)
                $("body").removeClass("loading")
              })
            }
          })
        }
      }
    }
    function refreshSyncBtn(){
      if (dataToSync.length) {
        syncInfo.style.display=""
        syncInfo.innerHTML=dataToSync.length
        $(syncInfo).tooltip({
          title:dataToSync.length+" changes waiting to sync"
        })
      }else {
        syncInfo.style.display="none"
      }
    }
    let codeFrameAlert=document.createElement("div")
    codeFrameAlert.classList.add("codeFrameAlert")
    codeFrameAlert.innerHTML='<i class="fa-solid fa-circle-exclamation"></i>'
    codeFrameAlert.style.display="none"
    function updateCodeFrameAlert(codeFrameAdditions){
      $(codeFrameAlert).popover("dispose")
      // console.log(codeFrameAdditions)
      if (Object.keys(codeFrameAdditions).length) {
        let body=document.createElement("div")
        body.innerHTML=Object.keys(codeFrameAdditions).map(q=>{
          return "<table class='cfTable'><tr><th colspan='2' style='text-align:center;'>"+q+"</th></tr><tr><th>code</th><th>label</th></tr>"+codeFrameAdditions[q].map(c=>"<tr><td>"+c.code+"</td><td>"+getTitle(c)+"</td></tr>").join("")+"</table>"
        }).join("<br><br>")
        let btn=document.createElement("button")
        btn.classList.add("btn","btn-secondary")
        btn.innerHTML="Check again"
        btn.onclick=function(e){
          let loader=$(btn).loader({zIndex:9991})
          $.ajax({url:"/get-forsta-survey-questions?pid="+settings.pid,global:false}).done(e=>{
            let checkDiv=document.createElement("div")
            let codeCheckTab=new Tabulator(checkDiv,{
              nestedFieldSeparator:"¬",
              data:[],
              columns:mapSchema(e)
            })
            codeCheckTab.on("tableBuilt",function(e){
              Object.keys(codeFrameAdditions).forEach((q, i) => {
                // console.log(codeCheckTab.getColumns(),q,codeCheckTab.getColumn(q))
                let variable=codeCheckTab.getColumn(q).getDefinition().accessorDataParams.variable
                codeFrameAdditions[q]=codeFrameAdditions[q].filter((item, i) => {
                  return !variable.options.find(o=>o.code==item.code)
                });
                if (!codeFrameAdditions[q].length) {
                  editorTable.updateColumnDefinition(q,codeCheckTab.getColumn(q).getDefinition())
                  delete codeFrameAdditions[q]
                }
              });
              codeCheckTab.destroy()
              checkDiv.remove()
              $(btn).loader("done")
              updateCodeFrameAlert(codeFrameAdditions)
            })
          })
        }
        let content=document.createElement("div")
        content.append(body,btn)

        $(codeFrameAlert).popover({
          title:"Cannot sync - New codes need adding to variable(s)",
          html:true,
          content:content
        })
        codeFrameAlert.style.display=""
        if (isSyncing) {
          syncBtn.click()
        }
      }else {
        codeFrameAlert.style.display="none"
        if (!isSyncing) {
          syncBtn.click()
        }
      }
    }
    syncCont.append(codeFrameAlert)
    container.append(syncCont,toolbar,tableHolder)
    if (!settings.pid) {
      let startGuide=document.createElement("div")
      startGuide.innerHTML=`<iframe src="https://scribehow.com/embed/How_to_open_and_view_data_for_JA2_Tester_v2_survey__ir_nvyKqQGWQjFywkvR-0Q" width="100%" height="640" allowfullscreen frameborder="0"></iframe>`
      container.append(startGuide)
    }
    container.classList.add("forstaDataEditor")
    settings.el.append(container)
    if (settings.pid) {
      $.ajax("/get-forsta-survey-questions?raw=true&pid="+settings.pid+"&variables=respid,lastchannel,"+settings.variables.join(",")).done(questions=>{
        if (editorTable) {
          editorTable.destroy()
        }
        let ph=document.createElement("div")
        ph.style.width="100%"
        ph.style.textAlign="center"
        ph.innerHTML="No rows to display"
        editorTable=new Tabulator(tableHolder,{
          nestedFieldSeparator:"¬",
          index:'respid',
          rowFormatter:r=>{
            if (r.getData().LastExtStatus=="51") {
              r.getElement().style.backgroundColor="#f7e5e5"
              r.getElement().style.background="repeating-linear-gradient( -45deg, #e91e634d, #e91e631f 2px, #f7e5e570 4px, #f7e5e536 4px )"
            }else if (r.getData().status=="incomplete") {
              r.getElement().style.backgroundColor="#dedede"
              r.getElement().style.background="repeating-linear-gradient( -45deg, #ffffff, #dedede 2px, #dedede 4px, #f7e5e536 4px )"
            }else {
              r.getElement().style.backgroundColor=""
              r.getElement().style.background=""
            }
          },
          // initialFilter:[{field:"status",type:"=",value:"complete"}],
          selectableRangeMode:"click",
          ajaxURL:"/get-forsta-completes",
          height:"85vh",
          layout:"fitDataFill",
          footerElement:tableFooter,
          placeholder:ph,
          ajaxParams:()=>({pid:settings.pid,completesFilter:settings.completesFilter,variables:settings.variables.join(",")}),
          ajaxResponse:(url,params,data)=>{
            console.log("RAW:",JSON.parse(JSON.stringify(data)))
            console.log("MUTATED:",data)
            return data
          },
          columns:mapSchema(questions)
        })
        editorTable.on("dataProcessed",function(e){
          console.log("loaded")
          updateHistory()
        })
        editorTable.on("menuClosed", function(component){
          $('.action-indicator').removeClass("action-indicator")
        });
        editorTable.on("renderComplete",function(){
          updateFooter()
        })
        editorTable.on("rowSelected", function(row){
          updateFooter()
        });
        editorTable.on("rowDeselected", function(row){
          updateFooter()
        });
      })
    }
    // let origUnload=window.onbeforeunload
    // window.onbeforeunload = function(){
    //   if (dataToSync.length) {
    //     return 'There are '+dataToSync.length+' changes that have not yet been synced with Forsta. Are you sure you want to leave?';
    //   }
    // };
    let codeFrameAdditions={}
    function createCoderTag(opt,onDel,onClick){
      let resp=$(document.createElement("div"))
      resp.addClass("coderTag")
      let respLabel=$(document.createElement("div"))
      respLabel.addClass("label")
      let respCode=$(document.createElement("div"))
      respCode.addClass("code")
      let respDel=$(document.createElement("button"))
      respDel.addClass("btn btn-primary").html('<i class="fa-solid fa-trash-can"></i>')
      resp.append(respCode).append(respLabel)
      if (onDel) {
        resp.append(respDel)
      }
      let i=opt.code
      respLabel.html(getTitle(opt))
      respCode.html(i)
      resp.prop("data-option",opt)
      resp.attr("data-code",i)
      resp.attr("data-label",getTitle(opt).toLowerCase())
      if (onDel) {
        respDel.click(e=>{
          onDel(i)
        })
      }
      if (onClick) {
        resp.click(e=>{
          onClick(i)
        })
      }
      return resp
    }
    function getUnusedCode(arr){
      var k = JSON.parse(JSON.stringify(arr));
      k.sort(function(a, b) { return a-b; });   // To sort by numeric
      var offset = 1;
      var lowest = -1;
      for (i = 0;  i < k.length;  ++i) {
        if (k[i] != offset) {
          lowest = offset;
          break;
        }
        ++offset;
      }
      if (lowest == -1) {
          lowest = k[k.length - 1] + 1;
      }
      return lowest
    }
    function startCoder(codeQuestion,verbQuestion,isBackcoding,callback){
      codeFrameAdditions[codeQuestion]=(codeFrameAdditions[codeQuestion]||[])
      let variable=editorTable.getColumn(codeQuestion).getDefinition().accessorDataParams.variable
      let verbVariable=editorTable.getColumn(verbQuestion).getDefinition().accessorDataParams.variable
      let backdrop=$(document.createElement("div"))
      let cleanVariable=isBackcoding?variable:verbVariable
      let cleanName=getTargetQ(cleanVariable)
      let respids=editorTable.getRows("active").filter(r=>{
        let qCleans=(getRowInfo(r.getData().respid).__rowCleans||[]).filter(h=>h.cleanType==(isBackcoding?"backcoding":"coding") && h.question==cleanName && (h.field||"")==((cleanVariable.currentField||{}).code||"") && (h.levelPath||"")==(cleanVariable.levelPath||""))
        return r.getData()[verbQuestion]!==undefined&&r.getData()[verbQuestion]!==""&&qCleans.length==0
      }).map(el=>el.getData().respid)
      let rowIndex=0
      backdrop.css({
        position:"absolute",
        top:0,
        left:0,
        "z-index":"2",
        width:"100%",
        height:"100%",
        background: "rgb(0 0 0 / 80%)"
      })
      backdrop.addClass("coderBackdrop")
      let codeFrame=$(document.createElement("div"))
      codeFrame.addClass("coderCodeFrame")
      let filterOptions=(inp,att)=>{
        codeFrame.children().hide()
        codeFrame.children().removeClass("btn btn-secondary")
        codeFrame.find(">div[data-"+att+(att=="code"?"^":"*")+"='"+inp.toLowerCase()+"']").show()
        codeFrame.find(">div:visible").eq(0).addClass("btn btn-secondary")
      }
      let cont=$(document.createElement("div"))
      cont.addClass("coder")
      $(container).append(backdrop).append(cont)
      cont.on("mousedown",function(e){
        if (e.target==cont[0]) {
          cont.remove()
          backdrop.remove()
          updateHistory()
        }
      })
      let question=$(document.createElement("div"))
      question.html(variable.name+". "+getTitle(variable)+(verbVariable.otherCode?" ("+getTitle(variable.options.find(o=>o.code==verbVariable.otherCode))+")":""))
      question.addClass("coderQuestion")
      backdrop.append(question)
      function getRow(currIndex){
        let tableRow=editorTable.getRow(respids[currIndex])
        let respid=tableRow.getIndex()
        let rowCont=$(document.createElement("div"))
        // cont.empty()
        codeFrame.children().show()
        let info=$(document.createElement("div"))
        info.html((currIndex+1)+"/"+respids.length+" - "+"respid:"+respid)
        info.addClass("coderVerbInfo")
        let verb=$(document.createElement("div"))
        verb.addClass("coderVerb")
        verb.attr("contenteditable",true)
        let codeInput=$(document.createElement("input"))
        codeInput.addClass("coderInput").attr("placeholder","Start typing a code or text...")
        rowCont.append(info,verb)
        let isMulti=variable.variableType=="multiChoice"
        let runningCodes=isMulti?((tableRow.getData()[codeQuestion]||{}).true||[]):(tableRow.getData()[codeQuestion]?[tableRow.getData()[codeQuestion]]:[])
        let tagHolder=$(document.createElement("div"))
        tagHolder.addClass("coderTagHolder")
        let setValue=(skipClean)=>{
          let val=tableRow.getData()[codeQuestion]
          let o=typeof val ==="string"?[val]:((val||{}).true||[])
          let n=runningCodes
          if (!skipClean) {
            if (isBackcoding) {
              addCleans([{respid:respid,cleanType:"backcoding",question:cleanName,cleanInfo:"",field:cleanVariable.currentField,levelPath:cleanVariable.levelPath}])
            }else {
              addCleans([{respid:respid,cleanType:"coding",question:cleanName,cleanInfo:"",field:cleanVariable.currentField,levelPath:cleanVariable.levelPath}])
            }
          }
          if (!_.isEqual(_.sortBy(n), _.sortBy(o))) {
            if (isMulti) {
              editorTable.getRow(respid).getCell(codeQuestion).setValue({
                true:runningCodes,
                false:_.difference(variable.options.map(o=>o.code),runningCodes)
              })
            }else {
              editorTable.getRow(respid).getCell(codeQuestion).setValue(runningCodes[0])
            }
          }
        }
        function nextRow(goBack,skipClean){
          if (!goBack) {
            setValue(skipClean)
          }
          if (!goBack&&currIndex<respids.length-1) {
            getNextRow()
          }else if (goBack&&currIndex>0) {
            getNextRow(goBack)
          }else if (!goBack&&callback) {
            cont.remove()
            backdrop.remove()
            updateHistory()
            callback()
          }else {
            // cont.click()
          }
        }
        const clickDel=code=>{
          // isUndo=false
          runningCodes=runningCodes.filter(c=>c!=code)
          // setValue(runningCodes)
          buildTagHolder()
          buildCodeFrame()
          codeInput.focus()
        }
        const clickResp=code=>{
          if (isMulti) {
            runningCodes=runningCodes.concat([code])
          }else {
            runningCodes=[code]
          }
          if (isBackcoding&&code!=verbVariable.otherCode) {
            runningCodes=runningCodes.filter(c=>c!=verbVariable.otherCode)
          }
          // isUndo=false
          buildTagHolder()
          buildCodeFrame()
          codeInput.focus()
          if (!isMulti) {
            nextRow()
          }
          // setValue(runningCodes)
        }
        function buildTagHolder(){
          tagHolder.empty()
          runningCodes.forEach((rowCode, i) => {
            let opt=variable.options.find(o=>o.code==rowCode)
            if (!opt) {
              opt=codeFrameAdditions[codeQuestion].find(o=>o.code==rowCode)
            }
            if (!opt) {
              alert("Interview "+respid+" has unknown code "+rowCode+" at "+codeQuestion+". Please check the variable on Forsta.")
            }else {
              tagHolder.append(createCoderTag(opt,clickDel))
            }
          });
        }
        function buildCodeFrame(){
          codeFrame.empty()
          variable.options.forEach((opt, i) => {
            if (!runningCodes.includes(opt.code)) {
              codeFrame.append(createCoderTag(opt,false,clickResp))
            }
          });
          codeFrameAdditions[codeQuestion].forEach((opt, i) => {
            if (!runningCodes.includes(opt.code)) {
              codeFrame.append(createCoderTag(opt,false,clickResp))
            }
          });
        }
        buildTagHolder()
        buildCodeFrame()
        rowCont.append(tagHolder).append(codeInput).append(codeFrame)
        let highlighted=0
        codeInput.keyup(function(e){
          if (e.key=="ArrowUp"&&currIndex>0&&!codeInput.val()) {
            nextRow(true,true)
          }else if (e.key=="ArrowDown"&&currIndex<respids.length-1&&!codeInput.val()) {
            nextRow(false,true)
          }else if (e.key=="ArrowDown"&&currIndex>=respids.length-1&&!codeInput.val()&&callback) {
            cont.remove()
            backdrop.remove()
            updateHistory()
            callback()
          }else if (e.key=="ArrowDown"&&codeInput.val()&&codeFrame.find("div:visible").length&&highlighted<codeFrame.find("div:visible").length) {
            codeFrame.find(">div:visible").removeClass("btn btn-secondary")
            highlighted++
            codeFrame.find(">div:visible").eq(highlighted).addClass("btn btn-secondary")
          }else if (e.key=="ArrowUp"&&codeInput.val()&&codeFrame.find("div:visible").length&&highlighted>0) {
            codeFrame.find(">div:visible").removeClass("btn btn-secondary")
            highlighted--
            codeFrame.find(">div:visible").eq(highlighted).addClass("btn btn-secondary")
          }else if (e.key=="Enter" || e.key=="," || e.key==";") {
            if (!codeInput.val()) {
              nextRow()
            }else {
              if (codeFrame.find(">div:visible").length) {
                console.log(highlighted,codeFrame.find(">div:visible").eq(highlighted))
                codeFrame.find(">div:visible").eq(highlighted).click()
                codeInput.val("")
                highlighted=0
              }else {
                if (confirm("Add "+codeInput.val()+" to code frame?")) {
                  isSyncing=false
                  syncBtn.innerHTML="Sync PAUSED"
                  let arr=variable.options
                  arr=arr.concat(codeFrameAdditions[codeQuestion])
                  let newOpt={code:getUnusedCode(arr.map(el=>Number(el.code))),texts:[{text:_.capitalize(codeInput.val())}]}
                  codeFrameAdditions[codeQuestion].push(newOpt)
                  arr.push(newOpt)
                  updateCodeFrameAlert(codeFrameAdditions)
                  let newTag=createCoderTag(newOpt,false,clickResp)
                  codeFrame.append(newTag)
                  newTag.click()
                  highlighted=0
                }else {
                  codeInput.click()
                  highlighted=0
                }
              }
            }
          }else {
            console.log(codeInput.val())
            if (codeInput.val()=="") {
              console.log("no input, resetting")
              codeFrame.children().show()
              codeFrame.children().removeClass("btn btn-secondary")
            }else if (isNaN(codeInput.val()/1)) {
              console.log("string input",codeInput.val())
              filterOptions(codeInput.val(),"label")
              highlighted=0
            }else {
              console.log("numeric input",codeInput.val())
              filterOptions(codeInput.val(),"code")
              highlighted=0
            }
          }
        })
        codeInput.click(function(e){
          codeInput.val("")
          codeInput.trigger("keyup")
          codeFrame.children().show()
        })
        codeInput.focus()
        rowCont.addClass("coderCont")
        verb.html(tableRow.getData()[verbQuestion])
        verb.blur(function(e){
          if (verb.text()!=tableRow.getData()[verbQuestion]) {
            tableRow.getCell(verbQuestion).setValue(verb.text())
          }
        })
        verb.on('contextmenu', function(e) {//What this does is simply; if right-click, run function(contains an event)
          console.log(e)
          e.preventDefault();
          if (tableRow.getData().lastchannel=="1") {
            let menu=$(document.createElement("div"))
            let addMenuItem=(item)=>{
              let btn=$(document.createElement("button"))
              btn.addClass("btn btn-flat btn-sm")
              btn.html(item.label)
              btn.click(function(e){
                item.action()
                menu.remove()
              })
              menu.append(btn)
            }
            addMenuItem({label:"Flag for QC",action:()=>{
              tableRow.getElement().classList.add("row-loading")
              let qname=getTargetQ(verbVariable)
              addCleans([{respid:respid,cleanType:"QC",question:"verbatim",cleanInfo:qname}]).then(e=>updateHistory())
              // let tableData=tableRow.getData().__qcChecks
              // console.log(cell.getData().__qcChecks,tableData)
              // tableData=tableData.filter(q=>q.cleanInfo!=qname)
              // tableData.push({cleanType:"QC",question:"verbatim",cleanInfo:qname})
              // tableRow.update({__qcChecks:tableData}).then(e=>{
              //   tableRow.reformat()
              //   tableRow.getElement().classList.remove("row-loading")
              // })
            }})
            $("body").append(menu)
            menu.css({
              display: 'block',//show the menu
              top: e.pageY,//make the menu be where you click (y)
              left: e.pageX,
              position: 'absolute',
              'z-index': 5,
              background:"white",
              'box-shadow':'0 0 5px 0 rgba(0,0,0,.2)',
            });
            $(document).one("click",()=>menu.remove())
          }
        });
        return rowCont
      }
      function getNextRow(goBack){
        currRow.css("top",goBack?"150vh":"-150vh")
        let prev=currRow[0]
        setTimeout(()=>{
          prev.remove()
        },300)
        if (goBack) {
          rowIndex--
        }else {
          rowIndex++
        }
        let next=getRow(rowIndex)
        next.css("top",goBack?"-150vh":"150vh")
        cont.append(next)
        setTimeout(()=>{
          next.css("top","")
          // console.log(next.find(".coderInput")[0])
          next.find(".coderInput")[0].focus()
        },300)
        currRow=next
      }
      let currRow
      if (respids.length) {
        currRow=getRow(0)
        cont.append(currRow)
        setTimeout(()=>{
          // console.log(currRow.find(".coderInput")[0])
          currRow.find(".coderInput")[0].focus()
        },300)
      }else if(callback) {
        cont.remove()
        backdrop.remove()
        callback()
      }else {
        alert("Nothing to "+(isBackcoding?"backcode":"code"))
        cont.remove()
        backdrop.remove()
      }
    }
    function destroyEditor(){
      // window.onbeforeunload=()=>{}
      if (editorTable) {
        editorTable.destroy()
      }
      tableHolder.remove(true)
    }
    settings.onRendered()

    return {
      getTable:()=>editorTable,
      container:container,
      toolbar:toolbar,
      on:(eventName,func)=>{
        container.addEventListener(eventName,func)
      },
      one:(eventName,func)=>{
        container.addEventListener(eventName,func,{once:true})
      }
    }
  }
}( jQuery ));
