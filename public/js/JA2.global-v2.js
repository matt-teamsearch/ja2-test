
function updateJob(query,table,fields,values,idfield,id,silent){
  var data =[]
  var jsonData={};
  var vals=[]
  var strVals={}
  jsonData.table=table
  jsonData.query=query
  for (var i = 0; i < fields.length; i++) {
    if (values[i]!==undefined && values[i]!=='' && values[i]!==null) {
      if (typeof values[i] === "string") {
        vals.push(fields[i]+"=@"+fields[i])
        strVals[fields[i]]=values[i]
      }else {
        vals.push(fields[i]+"='"+values[i]+"'")
      }
    }else {
      vals.push(fields[i]+"=NULL")
    }
  }
  jsonData.values=vals.join(", ")
  jsonData.stringValues=strVals
  jsonData.idfield=idfield
  jsonData.id=id
  jsonData.fieldsArr=fields
  jsonData.valuesArr=values
  var data2={}
  data2.jobID=id
  data.push(jsonData)
  var targetUpdateDone=true
  if (fields.map(el=>el.toLowerCase()).includes('hourlytarget')) {
    targetUpdateDone=false
    return $.ajax({
      url: '/update-past-target/',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data2),
      global:(silent?false:true),
      success: function(response){
        return tryupdate()
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
        return tryupdate()
      },
    });
  }else {
    return tryupdate()
  }
  function tryupdate(){
    return $.ajax({
      url: '/update-group-ajax',
      type: 'POST',
      global:(silent?false:true),
      contentType: 'application/json',
      data: JSON.stringify(data),
      success:function(response){
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
    });
  }
}
function waitForEl(selector,within) {
  return new Promise(resolve => {
    if ($(within).find(selector).length>0) {
      return resolve($(within).find(selector));
    }
    const observer = new MutationObserver(mutations => {
      if ($(within).find(selector).length>0) {
        resolve($(within).find(selector));
        observer.disconnect();
      }
    });
    observer.observe($(within)[0], {
      childList: true,
      subtree: true
    });
  });
}
function tsDates(d){
  let dte=moment(d)
  let qtrSt=[5,8,11,2]
  let getQtrSt=(dte)=>moment(dte).subtract(dte.month()<2?1:0,'years').set("month",qtrSt[dte.fquarter(6).quarter-1]).startOf('month').format("YYYY-MM-DD")
  let getQtrEn=(dte)=>moment(dte).subtract(dte.month()<2?1:0,'years').set("month",qtrSt[dte.fquarter(6).quarter-1]).startOf('month').add(2,'months').endOf('month').format("YYYY-MM-DD")
  let getYearSt=(dte)=>moment(dte).subtract(dte.month()<qtrSt[0]?1:0,'years').set('month',qtrSt[0]).startOf('month').format("YYYY-MM-DD")
  let getYearEn=(dte)=>moment(dte).add(dte.month()<qtrSt[0]?0:1,'years').set('month',qtrSt[0]).startOf('month').subtract(1,'d').format("YYYY-MM-DD")
  dte.qtr=dte.fquarter(6).quarter
  dte.busYear=dte.fquarter(6).toString().split(" ")[1]
  dte.busYearStart=getYearSt(dte)
  dte.busYearEnd=getYearEn(dte)
  dte.qtrStart=getQtrSt(dte)
  dte.qtrEnd=getQtrEn(dte)
  dte.lastQtr=moment(dte).subtract(3,'months').fquarter(6).quarter
  dte.lastBusYear=moment(dte).subtract(12,'months').fquarter(6).toString().split(" ")[1]
  dte.lastBusYearStart=getYearSt(moment(dte).subtract(12,'months'))
  dte.lastBusYearEnd=getYearEn(moment(dte).subtract(12,'months'))
  dte.lastQtrStart=getQtrSt(moment(dte).subtract(3,'months'))
  dte.lastQtrEnd=getQtrEn(moment(dte).subtract(3,'months'))
  return dte
}
function checkFind(obj){
  if (obj) {
    return obj
  }else {
    return {}
  }
}
function checkFilter(arr){
  if (arr) {
    return arr
  }else {
    return []
  }
}
function isSqlGroup(row,fields){
  return Object.keys(row).filter(k=>k.indexOf('grp')==0).every(k=>fields.indexOf(k)>-1?row[k]==0:row[k]==1)
}
function formatXLSXColumn(worksheet, col, fmt) {
  const range = XLSX.utils.decode_range(worksheet['!ref'])
  // note: range.s.r + 1 skips the header row
  for (let row = range.s.r + 1; row <= range.e.r; ++row) {
    const ref = XLSX.utils.encode_cell({ r: row, c: col })
    if (worksheet[ref] && worksheet[ref].t === 'n') {
      worksheet[ref].z = fmt
    }
  }
}

function hexToRGB(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
      return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  } else {
      return "rgb(" + r + ", " + g + ", " + b + ")";
  }
}
function decodeEntities(encodedString) {
    var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
    var translate = {
        "nbsp":" ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    };
    // console.log(encodedString)
    return !encodedString?'':encodedString.toString().replace(translate_re, function(match, entity) {
        return translate[entity];
    }).replace(/&#(\d+);/gi, function(match, numStr) {
        var num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    })
}
function cleanSmartChars(inp){
  var orig = inp;
  var s = orig;
  // Codes can be found here:
  // http://en.wikipedia.org/wiki/Windows-1252#Codepage_layout
  s = s.replace( /\u2018|\u2019|\u201A|\uFFFD/g, "'" );
  s = s.replace( /\u201c|\u201d|\u201e/g, '"' );
  s = s.replace( /\u02C6/g, '^' );
  s = s.replace( /\u2039/g, '<' );
  s = s.replace( /\u203A/g, '>' );
  s = s.replace( /\u2013/g, '-' );
  s = s.replace( /\u2014/g, '--' );
  s = s.replace( /\u2026/g, '...' );
  s = s.replace( /\u00A9/g, '(c)' );
  s = s.replace( /\u00AE/g, '(r)' );
  s = s.replace( /\u2122/g, 'TM' );
  s = s.replace( /\u00BC/g, '1/4' );
  s = s.replace( /\u00BD/g, '1/2' );
  s = s.replace( /\u00BE/g, '3/4' );
  s = s.replace(/[\u02DC|\u00A0]/g, " ");
  return s
}
function numberToOrdinal(n){
  n=typeof n ==="string"?Number(n):n
  return n+(["st","nd","rd"][((n+90)%100-10)%10-1]||"th")
}
function getForstaTitle(v){
  return v.titles?v.titles[0].text:(v.texts?v.texts[0].text:(v.name?v.name:v.code))
}
(function ( $ ) {
  var verticalTables=[]
  window.globalDataSources=[]
  var uniqueCntr = 0;
  $.fn.infoHover=function(){
    $(this).each(function(i) {
      if ($(this).find("i").length==0) {
        $(this).tooltip({
          html:true,
          placement:'right',
          title:$(this).html()
        })
        $(this).html(' <i class="fas fa-info-circle"></i>')
      }
    });
  }
  $.fn.getModal=function(params){
    var settings = $.extend(true,{
      title:null,
      body:"",
      footer:null,
      maxWidth:"500px",
      onLoad:()=>{},
      onClose:()=>{},
    }, params );
    let modal=$(jQuery.parseHTML(`<div class='modal fade' role='dialog'>
      <div class='modal-dialog modal-dialog-centered' style="max-width:`+settings.maxWidth+`" role='document'>
        <div class='modal-content'>
          <div class='modal-header'>
            <h5 class='modal-title'></h5>
            <button type='button' class='close modalClose' data-dismiss='modal' aria-label='Close'>
              <span aria-hidden='true'>&times;</span>
            </button>
          </div>
          <div class='modal-body'>

          </div>
          <div class='modal-footer'>
          </div>
        </div>
      </div>
    </div>`))
    let header=modal.find(".modal-header")
    let title=modal.find(".modal-title")
    let body=modal.find(".modal-body")
    let footer=modal.find(".modal-footer")
    if (settings.title!==null) {
      title.html(settings.title)
    }else {
      title.hide()
    }
    if (settings.body!==null) {
      body.html(settings.body)
    }else {
      body.hide()
    }
    if (settings.footer!==null) {
      footer.html(settings.footer)
    }else {
      footer.hide()
    }
    $('body').append(modal)
    $(modal).on("show.bs.modal",function(e){
      settings.onLoad(modal)
    })
    $(modal).on("hidden.bs.modal",function(e){
      settings.onClose(modal)
    })
    modal.modal("show")
    return modal
  }
  $.fn.forstaVariableSelector=function(params){
    var settings = $.extend(true,{
      pid:"",
      goFunction:(data,done)=>data,
      onLoad:()=>{},
      goValidation:()=>true,
      goText:"Go",
      modal:true,
      selectedVariables:[],
      dataQuery:false
    }, params );
    let element=this.length?this:"body"
    let modal=$(jQuery.parseHTML(`<div class='modal fade' role='dialog'>
      <div class='modal-dialog modal-dialog-centered variableSelectorModal' role='document'>
        <div class='modal-content'>
          <div class='modal-body'>
          </div>
        </div>
      </div>
    </div>`))
    let modalBody=modal.find(".modal-body")
    // console.log(element,this,modal,modalBody)
    //create HTML
    let container=$(document.createElement("div"))
    container.addClass("forstaVariableSelector")
    if (settings.modal) {
      modalBody.append(container)
    }
    let tablesCont=$(document.createElement("div"))
    tablesCont.addClass("variableContainer")
    container.append(tablesCont)

    let availableBox=$(document.createElement("div"))
    availableBox.addClass("variableBox")
    tablesCont.append(availableBox)

    let availableTable=$(document.createElement("div"))
    availableTable.addClass("variableCont")
    availableBox.append(availableTable)

    let buttonHolder=$(document.createElement("div"))
    buttonHolder.addClass("variableButtonHolder")
    tablesCont.append(buttonHolder)

    let addBtn=$(document.createElement("button"))
    addBtn.addClass("btn btn-sm btn-secondary")
    addBtn.html('<i class="fa-solid fa-angle-right"></i>')
    let addAllBtn=$(addBtn).clone()
    addAllBtn.html('<i class="fa-solid fa-angles-right"></i>')
    let remBtn=$(addBtn).clone()
    remBtn.html('<i class="fa-solid fa-angle-left"></i>')
    let remAllBtn=$(addBtn).clone()
    remAllBtn.html('<i class="fa-solid fa-angles-left"></i>')
    let qnaireQsBtn=$(addBtn).clone()
    qnaireQsBtn.attr("title","All in questionnaire").html('<i class="fa-regular fa-file-lines"></i><i class="fa-solid fa-angles-right"></i>')
    let openQsBtn=$(addBtn).clone()
    openQsBtn.attr("title","All open end").html('<i class="fa-regular fa-comment"></i><i class="fa-solid fa-angles-right"></i>')
    let otherQsBtn=$(addBtn).clone()
    otherQsBtn.attr("title","Questions with other specifies").html('<i class="fa-solid fa-bars-staggered"></i><i class="fa-solid fa-angles-right"></i>')
    let historyBtn=$(document.createElement("div"))
    historyBtn.attr("title","From past selection")
    let historyIcon=$(addBtn).clone()
    historyIcon.attr("data-toggle","dropdown").html('<i class="fa-solid fa-clock-rotate-left"></i><i class="fa-solid fa-angles-right"></i>')
    let historyMenu=$(document.createElement("div"))
    historyMenu.addClass("dropdown-menu")
    historyBtn.append(historyIcon,historyMenu)

    buttonHolder.append(historyBtn,qnaireQsBtn,openQsBtn,otherQsBtn)
    buttonHolder.append("<br>",addBtn,addAllBtn,remBtn,remAllBtn)

    let addedBox=$(document.createElement("div"))
    addedBox.addClass("variableBox")
    tablesCont.append(addedBox)

    let addedTable=$(document.createElement("div"))
    addedTable.addClass("variableCont")
    addedBox.append(addedTable)

    let footer=$(document.createElement("div"))
    footer.addClass("variableSelectFooter")
    container.append(footer)

    let filterBox=$(document.createElement("div"))
    filterBox.addClass("dataFilter")
    if (settings.hideFilter) {
      filterBox[0].style.display="none"
    }
    footer.append(filterBox)

    let dataFilterQ=$(document.createElement("select"))
    dataFilterQ.addClass("selectpicker").attr("data-live-search",true).attr("title","Filter by question")
    filterBox.append(dataFilterQ)

    let dataFilterC=$(document.createElement("select"))
    dataFilterC.addClass("selectpicker filterExp").attr("data-width","100px")
    dataFilterC.append(new Option('',''))
    let opt1=$(document.createElement("option"))
    opt1.attr("value","IN").attr("data-variableType","singleChoice multiChoice").html("Is one of")
    dataFilterC.append(opt1)
    let opt2=$(document.createElement("option"))
    opt2.attr("value","EQUALS").attr("data-variableType","text").html("Equals")
    dataFilterC.append(opt2)
    let opt3=$(document.createElement("option"))
    opt3.attr("value","CONTAINS").attr("data-variableType","text").html("Contains")
    dataFilterC.append(opt3)
    filterBox.append(dataFilterC)

    let dataFilterRText=$(document.createElement("input"))
    dataFilterRText.attr("type","text").attr("data-variableType","text").addClass("form-control dataFilterR filterExp").css("display","none")
    filterBox.append(dataFilterRText)

    let dataFilterRSel=$(document.createElement("select"))
    dataFilterRSel.addClass("selectpicker dataFilterR filterExp").prop("multiple",true).attr("data-variableType","singleChoice multiChoice").css("display","none")
    filterBox.append(dataFilterRSel)

    let filterExpression=""

    let addCheck=(name,checked,label,appendTo,hidden)=>{
      let cont=$(document.createElement("div"))
      cont.addClass("form-row")
      let box=$(document.createElement("input"))
      box.attr("type","checkbox").prop("checked",checked).addClass("filterExp")
      let lab=$(document.createElement("label"))
      lab.html(label)
      cont.append(box).append(lab)
      lab.click(e=>box.prop("checked",!box.prop("checked")))
      appendTo.append(cont)
      if (hidden) {
        cont[0].style.display="none"
      }
      return box
    }
    let createDataQuery=addCheck("createDataQuery",true,"Save for future use <span class='infoHover'>This first run will take longer, but when run in future will be much quicker</span>",filterBox,true)
    let completesOnly=addCheck("completesOnly",true,"Completes only",filterBox)
    let includeOpens=addCheck("includeOpens",true,"Include open-ends",filterBox)
    let includeNumerics=addCheck("includeNumerics",true,"Include numerics",filterBox)
    let includeSpecifies=addCheck("includeSpecifies",true,"Include other specifies",filterBox)
    if (settings.hideOptions) {
      includeOpens.parent()[0].style.display="none"
      includeNumerics.parent()[0].style.display="none"
      includeSpecifies.parent()[0].style.display="none"
    }

    let goBtn=$(document.createElement("button"))
    goBtn.addClass("btn btn-primary").html(settings.goText)
    footer.append(goBtn)

    if (settings.modal) {
      $(element).append(modal)
    }else {
      $(element).append(container)
    }
    //add functions
    let pid=settings.pid

    let tablesort=[{column:"pos", dir:"asc"}]
    let tableSorting=true
    let availVarTable=new Tabulator(availableTable[0],{
      ajaxURL:"/get-forsta-survey-questions",
      ajaxParams:{pid:pid,raw:true},
      // pagination:'local',
      layout:"fitDataStretch",
      height:290,
      // paginationSize:10,
      initialSort:tablesort,
      selectableRangeMode:"click",
      ajaxResponse:(url,params,data)=>{
        dataFilterQ.empty()
        dataFilterQ.append(new Option('',''))
        data.forEach((q, i) => {
          if (["text","singleChoice","multiChoice"].includes(q.variableType)) {
            let opt=new Option(q.name,q.name)
            $(opt).attr("data-variableType",q.variableType)
            $(opt).prop("data-options",q.options)
            dataFilterQ.append(opt)
          }
        });
        dataFilterQ.selectpicker("refresh")
        data=data.filter(q=>!q.isLoop && q.variableType!="multiGrid")
        return data.map((q,i)=>({...q,...{pos:i,title:(q.titles?q.titles:(q.texts?q.texts:[{text:''}]))[0].text}}))
      },
      columnDefaults:{
        headerSort:false,
        headerFilterPlaceholder:"Search..."
      },
      selectable:true,
      columns:[
        {formatter:"rowSelection",vertAlign:"middle",width:24,minWidth:24,headerSort:false,titleFormatter:"rowSelection"},
        {field:'variableType',vertAlign:"middle",headerSort:false,title:"",width:35,minWidth:35,formatter:(c,p,onR)=>{
          onR(()=>{
            $(c.getElement()).attr("title",c.getValue()?c.getValue():"")
          })
          let fieldCount=c.getData().fields?"<span class='forsta-variableFieldCount'>"+c.getData().fields.length+"</span>":""
          return c.getValue()?('<svg class="forsta-variableIconCont"><use xlink:href="#forsta-variable-'+c.getValue()+'"></use></svg>'+fieldCount):''
        },
        // tooltip:(e,c)=>c.getValue()
        },
        {title:"",vertAlign:"middle",headerSort:false,headerFilter:"input",headerFilterPlaceholder:"ID...",field:'name',width:57},
        {title:"",vertAlign:"middle",headerSort:false,headerFilter:"input",headerFilterPlaceholder:"Question...",field:'title'},
        {field:'pos',sorter:"number",visible:false}
      ]
    })
    let addedVarTable=new Tabulator(addedTable[0],{
      data:[],
      selectable:true,
      selectableRangeMode:"click",
      height:290,
      // pagination:'local',
      layout:"fitDataStretch",
      columnDefaults:{
        headerSort:false,
        headerFilterPlaceholder:"Search..."
      },
      initialSort:tablesort,
      tableBuilt:()=>{
        availVarTable.getRows().forEach((row, i) => {
          if (settings.selectedVariables.includes(row.name)) {
            addedVarTable.addData([row.getData()]).then(e=>{
              row.delete()
              addedVarTable.setSort(tablesort)
            })
          }
        })
        // element.dispatchEvent(new Event("fvs-loaded"))
        settings.onLoad()
      },
      // paginationSize:10,
      columns:[
        {formatter:"rowSelection",vertAlign:"middle",width:24,minWidth:24,headerSort:false, titleFormatter:"rowSelection"},
        {field:'variableType',vertAlign:"middle",headerSort:false,title:"",width:35,minWidth:35,formatter:(c,p,onR)=>{
          onR(()=>{
            $(c.getElement()).attr("title",c.getValue()?c.getValue():"")
          })
          let fieldCount=c.getData().fields?"<span class='forsta-variableFieldCount'>"+c.getData().fields.length+"</span>":""
          return c.getValue()?('<svg class="forsta-variableIconCont"><use xlink:href="#forsta-variable-'+c.getValue()+'"></use></svg>'+fieldCount):''
        },
        // tooltip:(e,c)=>c.getValue()
        },
        {title:"",vertAlign:"middle",headerSort:false,headerFilter:"input",headerFilterPlaceholder:"ID...",field:'name',width:57},
        {title:"",vertAlign:"middle",headerSort:false,headerFilter:"input",headerFilterPlaceholder:"Question...",field:'title'},
        {field:'pos',sorter:"number",visible:false}
      ]
    })
    if (addedVarTable.on) {
      addedVarTable.on("tableBuilt",function(){
        availVarTable.getRows().forEach((row, i) => {
          if (settings.selectedVariables.includes(row.name)) {
            addedVarTable.addData([row.getData()]).then(e=>{
              row.delete()
              if (tableSorting) {
                addedVarTable.setSort(tablesort)
              }
            })
          }
        })
        // element.dispatchEvent(new Event("fvs-loaded"))
        settings.onLoad()
      })
    }
    addBtn.click(e=>{
      createDataQuery.prop("disabled",false)
      availVarTable.getRows().forEach((row, i) => {
        if (row.isSelected()) {
          addedVarTable.addData([row.getData()]).then(e=>{
            row.delete()
            if (tableSorting) {
              addedVarTable.setSort(tablesort)
            }
          })
        }
      })
    })
    addAllBtn.click(e=>{
      createDataQuery.prop("disabled",false)
      tablesort=[{column:"pos", dir:"asc"}]
      addedVarTable.addData(availVarTable.getData()).then(e=>{
        availVarTable.setData([]).then(e=>{
          addedVarTable.setSort(tablesort)
        })
      })
    })
    remBtn.click(e=>{
      createDataQuery.prop("disabled",false)
      addedVarTable.getRows().forEach((row, i) => {
        if (row.isSelected()) {
          availVarTable.addData([row.getData()]).then(e=>{
            row.delete()
            availVarTable.setSort(tablesort)
          })
        }
      })
    })
    remAllBtn.click(e=>{
      createDataQuery.prop("disabled",false)
      tablesort=[{column:"pos", dir:"asc"}]
      availVarTable.addData(addedVarTable.getData()).then(e=>{
        addedVarTable.setData([]).then(e=>{
          availVarTable.setSort(tablesort)
        })
      })
    })
    qnaireQsBtn.click(e=>{
      createDataQuery.prop("disabled",false)
      availVarTable.clearFilter(true);
      availVarTable.addFilter("isInQnaire","=",true)
      addedVarTable.addData(availVarTable.getData("active")).then(e=>{
        availVarTable.clearFilter(true)
        availVarTable.setData(availVarTable.getData().filter(r=>!r.isInQnaire)).then(e=>{
          addedVarTable.setSort(tablesort)
        })
      })
    })
    historyBtn.prop("disabled",true)
    $.ajax("/get-forsta-export-history?pid="+pid).done(e=>{
      // console.log(e)
      e.forEach((h, i) => {
        let historyItem=item=>{
          let vars=JSON.parse(h.variables)
          let btn=$(document.createElement("btn"))
          btn.addClass("btn btn-flat btn-sm dropdown-item").html((new Date(item.exportDate)).toLocaleString("en-GB"))
          btn.click(()=>{
            // tablesort=[]
            createDataQuery.prop("checked",false).prop("disabled",true)
            settings.dataQuery=item.dataQueryId
            availVarTable.addData(addedVarTable.getData()).then(e=>{
              addedVarTable.setData([]).then(e=>{
                let toAdd=availVarTable.getData().filter(q=>vars.includes((q.loopParent||(q.originalname||q.name))))
                let toKeep=availVarTable.getData().filter(q=>!vars.includes((q.loopParent||(q.originalname||q.name))))
                addedVarTable.setData(toAdd).then(e=>{
                  availVarTable.setData(toKeep)
                })
              })
            })
          })
          // console.log(btn)
          return btn
        }
        historyBtn.find(".dropdown-menu").append(historyItem(h))
      });
      historyBtn.prop("disabled",false)
    })
    openQsBtn.click(()=>{
      createDataQuery.prop("disabled",false)
      availVarTable.getRows().forEach((row, i) => {
        let q=row.getData()
        // console.log(vars,q,(q.loopParent||(q.originalname||q.name)))
        if (q.variableType=="text") {
          addedVarTable.addData([row.getData()]).then(e=>{
            row.delete()
          })
        }
      })
      if (tableSorting) {
        addedVarTable.setSort(tablesort)
      }
    })
    otherQsBtn.click(()=>{
      createDataQuery.prop("disabled",false)
      availVarTable.getRows().forEach((row, i) => {
        let q=row.getData()
        // console.log(vars,q,(q.loopParent||(q.originalname||q.name)))
        if ((q.options||[]).find(o=>o.hasOtherField)) {
          addedVarTable.addData([row.getData()]).then(e=>{
            row.delete()
          })
        }
      })
      if (tableSorting) {
        addedVarTable.setSort(tablesort)
      }
    })
    let getData=()=>{
      return {
        pid:pid,
        variables:addedVarTable.getData().map(q=>(q.loopParent||(q.originalname||q.name))),
        completesFilter:filterExpression,
        includeOpens:includeOpens.is(":checked"),
        includeNumerics:includeNumerics.is(":checked"),
        includeSpecifies:includeSpecifies.is(":checked"),
        dataQuery:settings.dataQuery
      }
    }
    let goFunctions={
      toplines:(data,done)=>{
        $.ajax({
          url:"/create-forsta-toplines",
          global:false,
          method:"POST",
          data:data,
        }).done(file=>{
          // console.log(path)
          var link=document.createElement('a');
          link.href=file.path
          link.download=file.filename
          link.click();
          done()
        }).fail(err=>{
          alert("Could not create toplines. Contact the system administrator")
          done()
        })
      },
      data:(data,done)=>{
        $.ajax({
          url:"/create-forsta-datafile",
          global:false,
          method:"POST",
          data:data,
        }).done(file=>{
          // console.log(path)
          var link=document.createElement('a');
          link.href=file.path
          link.download=file.filename
          link.click();
          done()
        }).fail(err=>{
          alert("Could not create data file. Contact the system administrator")
          done()
        })
      }
    }
    goBtn.click(e=>{
      updateDataFilter()
      if (settings.goValidation(getData())) {
        $.ajax({global:false,method:'post',data:{pid:pid,variables:getData().variables},url:"/add-forsta-export-history"})
        goBtn.loader({container:container})
        if (typeof settings.goFunction === "string") {
          if (!goFunctions[settings.goFunction]) {
            console.warn("goFunction '"+settings.goFunction+"' not recognised")
          }else {
            goFunctions[settings.goFunction](getData(),()=>{
              goBtn.loader('done')
            })
          }
        }else {
          if (settings.goFunction.length==1) {
            settings.goFunction(getData())
            goBtn.loader('done')
            modal.modal("hide")
          }else {
            settings.goFunction(getData(),()=>{
              goBtn.loader('done')
              modal.modal("hide")
            })
          }
        }
      }
    })
    function updateDataFilter(updateOpts){
      let filt=""
      let q=dataFilterQ.val()
      if (!q) {
        dataFilterRSel.val("")
        dataFilterRText.val("")
        dataFilterC.empty()
      }else{
        if (updateOpts && dataFilterQ.find('option:selected').prop("data-options")) {
          dataFilterRSel.val("").empty()
          dataFilterQ.find('option:selected').prop("data-options").forEach((item, i) => {
            let o=new Option(item.code+" - "+item.texts[0].text,item.code)
            dataFilterRSel.append(o)
          });
        }
        let type=dataFilterQ.find('option:selected').attr("data-variableType")
        let comp=dataFilterC.val()
        let r
        if (type=="text") {
          dataFilterRSel.val("").hide().selectpicker("hide")
          dataFilterRText.show()
          r=dataFilterRText.val()
        }else {
          dataFilterRSel.show().selectpicker("show")
          dataFilterRText.hide()
          r=dataFilterRSel.val()
        }
        dataFilterC.find('option:not([data-variableType*="'+type+'"])').prop("disabled",true).prop("selected",false)
        dataFilterC.find('option[data-variableType*="'+type+'"]').prop("disabled",false)
        dataFilterRSel.selectpicker("refresh")
        dataFilterC.selectpicker("refresh")
        dataFilterQ.selectpicker("refresh")
        if (r) {
          if (comp=="CONTAINS") {
            filt="CONTAINS(LOWER(response:"+q+"), '"+r.toLowerCase()+"')"
          }else if(comp=="EQUALS") {
            filt="response:"+q+" = '"+r+"'"
          }else {
            filt="IN(response:"+q+",'"+r.join("','")+"')"
          }
        }
      }
      if (completesOnly.is(":checked")) {
        filt=filt?(filt+" AND response:status='complete'"):"response:status='complete'"
      }
      console.log("Filter expression: ",filt)
      filterExpression=filt
    }
    $("input.filterExp,select.filterExp").change(e=>{
      updateDataFilter()
    })
    $(dataFilterQ).change(e=>{
      updateDataFilter(true)
    })
    if (settings.modal) {
      modal.modal("show")
      modal.on('shown.bs.modal',function(e){
        setTimeout(()=>{
          // element.dispatchEvent(new Event("fvs-shown"))
          $(container).find(".selectpicker").selectpicker()
          addedVarTable.redraw(true)
          availVarTable.redraw(true)
        },100)
      })
      modal.on('hidden.bs.modal',function(e){
        setTimeout(()=>{
          // element.dispatchEvent(new Event("fvs-hidden"))
          addedVarTable.destroy()
          availVarTable.destroy()
          modal.remove(true)
        },100)
      })
    }else {
      setTimeout(()=>{
        $(container).find(".selectpicker").selectpicker()
        addedVarTable.redraw(true)
        availVarTable.redraw(true)
      },100)
    }
    return {
      modalShow:()=>{
        modal.modal("show")
      },
      modalHide:()=>{
        modal.modal("show")
      },
      element:container,
      data:getData(),
      tables:{
        available:availVarTable,
        added:addedVarTable
      }
    }
  }
  $.fn.reverseChildren = function() {
    return this.each(function(){
      var $this = $(this);
      $this.children().each(function(){ $this.prepend(this) });
    });
  };
  $.fn.scrolled = function (waitTime, fn) {
      if (typeof waitTime === "function") {
          fn = waitTime;
          waitTime = 500;
      }
      var tag = "scrollTimer" + uniqueCntr++;
      this.scroll(function () {
          var self = $(this);
          var timer = self.data(tag);
          if (timer) {
              clearTimeout(timer);
          }
          timer = setTimeout(function () {
              self.removeData(tag);
              fn.call(self[0]);
          }, waitTime);
          self.data(tag, timer);
      });
  }
  $.fn.innerPage=function(params){
    let divParams={}
    $(this).each(function(e){
      $.each(this.attributes, function() {
        if (this.name.indexOf('data')>-1) {
          divParams[this.name.replace("data-","")]=this.value
        }
      })
      divParams = $.extend(divParams, params );
      var settings = $.extend({
        width: '100%',
        height:'100%',
        title:'Untitled'
      }, divParams );
      // $(this).css('height',settings.height)
      let url=$(this).attr('data-href')
      let container=this
      $(container).html('')
      let header=document.createElement("h5")
      $(header).text(settings.title)
      $(container).addClass("preLoad")
      $(container).append(header)
      let view=$('body .container:first')
      var elemTop = $(container).offset().top
      var elemBottom = elemTop+($(container).height())
      let loadState=false
      let loadPage=function(){
        var docViewTop = view.scrollTop();
        var docViewBottom = docViewTop + view.height();
        let loadReq
        let ajaxInProgress=false
        if (elemBottom <= docViewBottom && elemTop >= docViewTop) {
          if (!loadState && !ajaxInProgress) {
            loadState=true
            ajaxInProgress=true
            $(container).loader()
            loadReq=$.ajax({
              url:url,
              global:false,
              success:(input)=>{
                ajaxInProgress=false
                if (loadState && $(container).find('div').length==0) {
                  if (((elemBottom <= docViewBottom) && (elemTop >= docViewTop))) {
                    let html=jQuery.parseHTML(input,document,true)
                    let afterLoader=false
                    $(html[html.length-1].childNodes).each(function(e){
                      if ($(this).hasClass("load")) {
                        afterLoader=true
                      }else if (afterLoader==true) {
                        $(container).append(this)
                      }
                    })
                    $(container).loader('done')
                    $(container).removeClass("preLoad")
                  }
                }
              }
            })
          }
        }else if (loadState) {
          loadState=false
          $(container).html('')
          $(container).loader('done')
          $(container).addClass("preLoad")
          $(container).append(header)
        }
      }
      view.scroll(loadPage)
    })
    return this
  }
  $.fn.onPositionChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastPos = null;
    var lastOff = null;
    let invl=setInterval(function () {
      if (o == null || o.length < 1) return o; // abort if element is non existend eny more
      if (lastPos == null) lastPos = o.position();
      if (lastOff == null) lastOff = o.offset();
      var newPos = o.position();
      var newOff = o.offset();
      if (lastPos.top != newPos.top || lastPos.left != newPos.left) {
          $(this).trigger('onPositionChanged', { lastPos: lastPos, newPos: newPos });
          if (typeof (trigger) == "function") trigger(lastPos, newPos);
          lastPos = o.position();
      }
      if (lastOff.top != newOff.top || lastOff.left != newOff.left) {
          $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff});
          if (typeof (trigger) == "function") trigger(lastOff, newOff);
          lastOff= o.offset();
      }
      if (!$(this).attr("data-loader")) {
        clearInterval(invl)
      }
    }, millis);
    return invl;
  };
  $.fn.loader=function(params,aux){
    let loaders=[]
    $(this).each(function(e){
      let thisEl=this
      let getHeight=()=>$(thisEl).height()+parseInt($(thisEl).css('padding-bottom'))+parseInt($(thisEl).css('margin-bottom'))+parseInt($(thisEl).css('padding-top'))+parseInt($(thisEl).css('margin-top'))
      let getWidth=()=>$(thisEl).width()+parseInt($(thisEl).css('padding-right'))+parseInt($(thisEl).css('margin-right'))+parseInt($(thisEl).css('padding-left'))+parseInt($(thisEl).css('margin-left'))
      function outputsize(els,cont) {
        els.forEach((el, i) => {
          let w=((el.borderBoxSize?el.borderBoxSize[0].inlineSize:getWidth())+2)+"px"
          let h=((el.borderBoxSize?el.borderBoxSize[0].blockSize:getHeight())+2)+"px"
          let id=el.target?el.target.id:el.id
          let element=el.target?el.target:el
          let contTop=$(cont).offset().top
          let contLeft=$(cont).offset().left
          $('#'+$(element).attr("data-loader")).css("width",w).css("height",h).css('top',(($(element).offset().top-contTop)+settings.offsetTop)+"px").css('left',(($(element).offset().left-contLeft)+settings.offsetLeft)+"px")
        });
      }
      function splitToSpans(txt){
        return txt.split("").map((el,i)=>"<span style='animation-delay: 0."+(i+1)+"s'>"+el+"</span>").join("")
      }
      let loader
      if ($(thisEl).attr("data-loader") && params!='info') {
        loader=$('#'+$(thisEl).attr("data-loader"))
        if (loader) {
          loader.remove()
        }
        $(thisEl).attr("data-loader",false)
      }
      if ($(thisEl).attr("data-loader") && params=='info' && !aux) {
        loader=$('#'+$(thisEl).attr("data-loader"))
        return loader.find('.loadingMessage h6').text()
      }
      if ($(thisEl).attr("data-loader") && params=='info' && aux) {
        loader=$('#'+$(thisEl).attr("data-loader"))
        loader.find('.loadingMessage').html("<h6>"+aux+"...</h6>")
      }
      if (params!="done" && params!="info") {
        let id='loader-'+Date.now()
        $(thisEl).attr("data-loader",id)
        var settings = $.extend({
          width:getWidth()+"px",
          height:getHeight()+"px",
          top:$(thisEl).offset().top+"px",
          left:$(thisEl).offset().left+"px",
          offsetTop:0,
          offsetLeft:0,
          container:'body',
          fixed:false,
          backgroundColor:'rgba(255, 255, 255, 0.71)',
          element:`<svg class="loadSpinner" viewBox="0 0 50 50">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
          </svg>`,
          title:'',
          zIndex:9990,
        }, params );
        if ($(settings.container).css('position')!='absolute') {
          $(settings.container).css('position','relative')
        }
        loader=jQuery.parseHTML(`<div class="loader" title="`+settings.title+`" id="`+id+`" style="transition:1s opacity;transform:`+($(thisEl).css('transform')?$(thisEl).css('transform'):'none')+`;display:block;width:`+settings.width+`;height:`+settings.height+`;z-index: `+settings.zIndex+`;overflow: hidden;position: `+(settings.fixed?"fixed":"absolute")+`;top: `+settings.top+`;left: `+settings.left+`;backdrop-filter: blur(5px);background: `+settings.backgroundColor+`;border-radius: inherit;"><div class="loadSpinnerSizer">
          <div class="loadingMessage" style="text-align: center;width: 100%;bottom: -23px;position: absolute;">
          `+(settings.info?`
            <h6>`+splitToSpans(settings.info+"...")+`</h6>
            `:'')+`
          </div>
        </div></div>`)
        // console.log("Loader for:",thisEl,loader)
        $(loader).find('.loadSpinnerSizer').prepend(settings.element)
        $(settings.container).eq(0).append(loader)
        $(loader).prop('data-container',$(settings.container)[0])
        // $(loader).find('.loader').eq(0).prop("sourceEl",thisEl)
        // let resizeObs=new ResizeObserver(outputsize).observe(thisEl)
        if (!settings.fixed) {
          let checkPosition=setInterval(()=>{
            // console.log("checking position",thisEl,loader)
            outputsize([thisEl],settings.container)
            if (!$(thisEl).is(":visible")) {
              $(loader).remove()
              clearInterval(checkPosition)
            }
            if (!$(thisEl).attr("data-loader") || $(thisEl).attr("data-loader")=='false') {
              $(loader).css('opacity','0')
              setTimeout(()=>{
                // let findFunc=Tabulator.prototype.findTable || Tabulator.findTable
                // if (findFunc("*")) {
                  //   findFunc("*").forEach(t=>t.blockRedraw())
                  // }
                  $(loader).remove()
                  // if (findFunc("*")) {
                    //   findFunc("*").forEach(t=>t.restoreRedraw())
                    // }
                  },1000)
                  clearInterval(checkPosition)
                }
              },100)
        }
        // let observer=new MutationObserver((muts,obs)=>{
        //   muts.forEach((mut, i) => {
        //     console.log(mut)
        //     if (mut.attributeName=='data-loader') {
        //       obs.disconnect()
        //     }
        //   });
        // })
        // observer.observe(thisEl,{attributes: true})
      }
      loaders.push(loader)
    })
    return loaders
  }
  $.fn.alertBanner=function(params){
    let el
    if (params=="spin") {
      this.find('.alertBannerSpinner').css('opacity',0.8)
      el=this
    }else if (!params) {
      this.hide()
      el=this
    }else {
      var settings = $.extend({
        // These are the defaults.
        class: "secondary",
        size:'md',
        info: "No alert to show"
      }, params );
      el=jQuery.parseHTML(`
        <div class="alertBanner alertBanner-`+settings.size+`">
          <div class="alertBannerSpinner `+settings.class+`">
          </div>
          <div class="alertBannerBar `+settings.class+`">
            <div class="alertBannerIcon `+settings.class+`">
              `+(settings.class=='success'?'<i class="far fa-check-circle"></i>':'<i class="fas fa-exclamation-circle"></i>')+`
            </div>
            <div class="alertBannerInfo `+settings.class+`">
              `+settings.info+`
            </div>
          </div>
        </div>
      `)
      this.html(el)
      $(el).find('.alertBannerSpinner').css('opacity',0)
    }
    return el
  }
  $.fn.reportFilter=function(params){
    $('.reportFilterContainer').remove()
    $('#reportInfo').remove()
    $('.top-spacer').css("height",'')
    if ($(".innerPage").length) {
      throw new TypeError()
    }
    if (params!='destroy' && $(this).closest(".innerPage").length==0) {
      var settings = $.extend(true,{
        minDate:'2020-01-01',
        maxDate:moment().format("YYYY-MM-DD"),
        maxDays:9999,
        quickDates:{
          calMonth:true,
          payMonth:true,
          qtr:true,
          calYear:true,
          busYear:true,
        },
        onRendered:function(el){
          console.log("No render function specified",el)
        },
        renderFuncs:[],
        onRefresh:function(vals){console.log("No refresh function specified",vals)},
        filters:{
          stDate:moment().startOf('month').format('YYYY-MM-DD'),
          enDate:moment().subtract(1,'days').format('YYYY-MM-DD'),
          team:null,
          agent:null,
          rigourHourly:null,
          onlyRigourHourly:null,
          bmgHourly:null,
          dayTypes:null,
          employedDays:null,
          shift:null,
          job:null,
          client:null,
          jobTypes:null,
          minHours:null,
          minShifts:null,
          cmpm:null
        },
        customFilters:[]
      }, params );
      let container=document.createElement("div")
      let changed=[]
      $(container).addClass("reportFilterContainer")
      let header=document.createElement("h6")
      $(header).text("Report filters")
      $(container).append(header)
      function updateInfo(){
        let info=[]
        $('[data-filterfield]').each(function(e){
          if ($(this).val() && $(this).val().length>0) {
            let vals=[]
            if (this.type=='date') {
              vals.push(moment(this.value).format("DD/MM/YYYY"))
            }
            if (this.type=='number' || this.type=='text') {
              vals.push(this.value)
            }
            if (this.type=='checkbox') {
              vals.push($(this).is(':checked')?'Y':'N')
            }
            if (this.nodeName=='SELECT') {
              vals.push($('[data-id="'+this.id+'"]').attr("title"))
            }
            info.push({title:$('label[for="'+this.id+'"]').html(),vals:vals.join(", ")})
          }
        })
        $('#reportInfo').html(info.map(i=>"<b>"+i.title+"</b> "+i.vals).join(" | "))
        $('.top-spacer').css("height",'48px')
      }
      function addFilter(field,name,type,min,max,preText,cssClass,val,options,attributes,exclusiveOf,dependantOn){
        let v=val!=null?(val.val?val.val:val):null
        let div=document.createElement("div")
        $(div).addClass("reportFilter")
        let label=document.createElement("label")
        $(label).attr("for",name).text(preText+":")
        let input
        if (type=='select') {
          v=Array.isArray(v)?v:(v && v!='0'?[v]:[])
          input=document.createElement("select")
          $(input).attr("id",name).attr("name",name).addClass(cssClass).attr("data-filterField",field).attr("value","").attr("data-width",'100%').attr("title",'All').attr('data-size',10)
          if (!attributes['multiple']) {
            $(input).append(new Option('', 0))
          }
          options.forEach((opt, i) => {
            if (opt.txt!=='') {
              let newOpt=new Option(opt.txt, opt.id)
              if (v.indexOf(opt.id)>-1 && v.length>0) {
                $(newOpt).attr('selected',true)
              }
              if (opt.disabled) {
                $(newOpt).attr('disabled',true)
              }
              $(input).append(newOpt)
            }
          });
          settings.renderFuncs.push(()=>{
            $(input).selectpicker('val',v)
          })
          if (v.length<1) {
            input.selectedIndex = -1
          }
        }else {
          input=document.createElement("input")
          if (type=='checkbox') {
            $(input).attr("type",type).attr("id",name).attr("name",name).attr("max",max).attr("min",min).addClass(cssClass).attr("checked",v?true:false).attr("data-filterField",field)
          }else if(type=='date') {
            $(input).attr("type",type).attr("id",name).attr("name",name).attr("max",max).attr("min",min).addClass(cssClass).attr("value",v).attr("data-filterField",field)
          }else {
            $(input).attr("type",type).attr("id",name).attr("name",name).attr("max",max).attr("min",min).addClass(cssClass).attr("value",v?moment.min(v,moment()).format("YYYY-MM-DD"):v).attr("data-filterField",field)
          }
        }
        if (val) {
          if (val.disabled) {
            $(input).attr("disabled",true)
          }
        }
        Object.keys(attributes).forEach((att, i) => {
          $(input).attr(att,attributes[att])
        });
        $(div).append(label).append(input)
        if($(input).css('display')=='none'){
          $(div).hide()
        }
        $(input).on('change',function(e){
          changed.push(field)
          if ($(input).is(":checked") || $(input).val()) {
            exclusiveOf=exclusiveOf || []
            exclusiveOf.forEach((f, i) => {
              let el=$('[data-filterField='+f+']')
              if (el[0].type=='checkbox') {
                el.prop('checked',false)
              }else {
                el.val('')
              }
            });
            dependantOn=dependantOn || []
            dependantOn.forEach((f, i) => {
              let el=$('[data-filterField='+f+']')
              el.prop('checked',true)
            });
          }
        })
        $(container).append(div)
        return $(div)
      }
      $.ajax({
        url: '/get-filters',
        type: 'GET',
        // global:false,
        contentType: 'application/json',
        success: function (filterOptions) {
          let filterElements={}
          if (settings.filters.stDate!==null && settings.filters.enDate!==null) {
            filterElements.quickDate=addFilter('quickDate','quickDateFilter','select',null,null,'Quick dates','selectpicker',[],[{id:'payMonthSelectFilter',txt:'Pay month',disabled:!settings.quickDates.payMonth},{id:'monthSelectFilter',txt:'Calendar month',disabled:!settings.quickDates.calMonth},{id:'qtrSelectFilter',txt:'Quarter',disabled:!settings.quickDates.qtr},{id:'yearSelectFilter',txt:'Calendar year',disabled:!settings.quickDates.calYear},{id:'busYearSelectFilter',txt:'Business year',disabled:!settings.quickDates.busYear}],{})
          }
          function limitRange(e){
            $('#stDate').attr('min',moment.max(moment(settings.minDate),moment($('#enDate').val()).subtract(settings.maxDays,'days')).format("YYYY-MM-DD"))
            $('#enDate').attr('max',moment.min(moment(settings.maxDate),moment($('#stDate').val()).add(settings.maxDays,'days')).format("YYYY-MM-DD"))
          }
          filterElements.stDate=addFilter('stDate','stDate','date',settings.minDate,settings.maxDate,'From','form-control',settings.filters.stDate,[],(settings.filters.stDate==null?{style:'display:none'}:{}))
          filterElements.enDate=addFilter('enDate','enDate','date',settings.minDate,settings.maxDate,'To','form-control',settings.filters.enDate,[],(settings.filters.enDate==null?{style:'display:none'}:{}))
          filterElements.stDate.find('.input').change(limitRange)
          filterElements.enDate.find('.input').change(limitRange)
          if (settings.filters.team!==null) {
            addFilter('team','teamFilter','select',null,null,'Teams','selectpicker',settings.filters.team,filterOptions.teams,{multiple:true,'data-live-search':true})
          }
          if (settings.filters.agent!==null) {
            addFilter('agent','agentFilter','select',null,null,'Agents','selectpicker',settings.filters.agent,filterOptions.agents,{multiple:true,'data-live-search':true,'data-actions-box':true})
          }
          if (settings.filters.rigourHourly!==null) {
            addFilter('rigourHourly','rigourHourlyFilter','checkbox',null,null,'Incl. Rigour hourly','form-control',settings.filters.rigourHourly,[],{},['onlyRigourHourly'])
          }
          if (settings.filters.onlyRigourHourly!==null) {
            addFilter('onlyRigourHourly','onlyRigourHourlyFilter','checkbox',null,null,'Show only Rigour hourly','form-control',settings.filters.onlyRigourHourly,[],{},[],['rigourHourly'])
          }
          if (settings.filters.bmgHourly!==null) {
            addFilter('bmgHourly','bmgHourlyFilter','checkbox',null,null,'Incl. BMG hourly','form-control',settings.filters.bmgHourly,[],{})
          }
          if (settings.filters.dayTypes!==null) {
            addFilter('dayTypes','dayTypeFilter','select',null,null,'Day types','selectpicker',settings.filters.dayTypes,[{txt:'Weekends',id:'weekends'},{txt:'Weekdays',id:'weekdays'}],{})
          }
          if (settings.filters.employedDays!==null) {
            addFilter('employedDays','employedDaysFilter','number',1,9999,'# Days employed','form-control',settings.filters.employedDays,[],{})
          }
          if (settings.filters.client!==null) {
            addFilter('client','clientFilter','select',null,null,'Client','selectpicker',settings.filters.client,filterOptions.clients,{multiple:true,'data-actions-box':true,'data-live-search':true})
          }
          if (settings.filters.shift!==null) {
            addFilter('shift','shiftFilter','select',null,null,'Shifts','selectpicker',settings.filters.shift,[{txt:'Day',id:'d'},{txt:'Eve',id:'e'}],{})
          }
          if (settings.filters.job!==null) {
            addFilter('job','jobFilter','select',null,null,'Job','selectpicker',settings.filters.job,filterOptions.jobs,{multiple:true,'data-live-search':true,'data-actions-box':true})
          }
          if (settings.filters.minHours!==null) {
            addFilter('minHours','minHoursFilter','number',0,9999,'Minimum hours','form-control',settings.filters.minHours,[],{})
          }
          if (settings.filters.minShifts!==null) {
            addFilter('minShifts','minShiftsFilter','number',0,9999,'Minimum number of shifts','form-control',settings.filters.minShifts,[],{})
          }
          if (settings.filters.jobTypes!==null) {
            addFilter('jobTypes','jobTypeFilter','select',null,null,'Job features','selectpicker',settings.filters.jobTypes,[
              {id:'isJobBusiness',txt:'B2B'},
              {id:'isJobConsumer',txt:'Consumer'},
              {id:'isJobRecruitment',txt:'Recruitment'},
              {id:'isJobCATI',txt:'CATI'},
              {id:'isJobFace',txt:'F2F'},
              {id:'isJobOnline',txt:'Online'},
              {id:'isJobConfirmit',txt:'ConfirmIt'},
              {id:'isJobInHouse',txt:'In-house'},
              {id:'isJobHourly',txt:'Charged hourly'},
              {id:'isJobDeskResearch',txt:'Desk research'},
              {id:'isJobInternational',txt:'International'},
              {id:'isJobValidation',txt:'Validations'},
              {id:'isJobRecontacts',txt:'Recontacts'},
            ],{multiple:true,'data-live-search':true})
          }
          settings.customFilters.forEach((filter, i) => {
            addFilter(filter.el.id,filter.el.id+'Filter',filter.el.nodeName.toLowerCase(),null,null,filter.label,(filter.el.nodeName=='SELECT'?'selectpicker':'form-control'),filter.val,filter.el.options?Array.apply(null, filter.el.options).map(el=>({id:el.value,txt:el.text})):null,{})
          });
          let qtrSt=[5,8,11,2]
          let getQtrSt=(dte)=>moment(dte).subtract(dte.month()<2?1:0,'years').set("month",qtrSt[dte.fquarter(6).quarter-1]).startOf('month')
          let getQtrEn=(dte)=>moment(dte).subtract(dte.month()<2?1:0,'years').set("month",qtrSt[dte.fquarter(6).quarter-1]).startOf('month').add(2,'months').endOf('month')
          let dates=Array.from(moment.range('2021-01-01',moment().subtract(1,'d')).by('day'))
          let months=Array.from(moment.range('2021-01-01',moment().subtract(1,'d')).by('month'))
          let years=Array.from(moment.range('2021-01-01',moment().subtract(1,'d')).by('year'))
          let busYears=dates.map(el=>({txt:el.fquarter(6).toString().split(" ")[1],dte:el})).filter((el,i,self)=>self.map(s=>s.txt).indexOf(el.txt)==i).map(el=>({txt:el.txt,st:moment(el.dte).subtract(el.dte.month()<2?1:0,'years').set('month',qtrSt[0]).startOf('month').format("YYYY-MM-DD"),en:moment(el.dte).add(el.dte.month()<2?0:1,'years').set('month',qtrSt[0]).subtract(1,'d').format("YYYY-MM-DD")}))
          let qtrs=dates.map(el=>({txt:el.fquarter(6).toString(),dte:el})).filter((el,i,self)=>self.map(s=>s.txt).indexOf(el.txt)==i).map(el=>({txt:el.txt,st:getQtrSt(el.dte).format("YYYY-MM-DD"),en:getQtrEn(el.dte).format("YYYY-MM-DD")}))
          let qtrSelect=addFilter('qtrSelect','qtrSelectFilter','select',null,null,'Quarter','selectpicker quickDates',[],qtrs.map(el=>({txt:el.txt,id:el.st+"_"+el.en})).reverse(),{})
          let busYearSelect=addFilter('busYearSelect','busYearSelectFilter','select',null,null,'Business year','selectpicker quickDates',[],busYears.map(el=>({txt:el.txt,id:el.st+"_"+el.en})).reverse(),{})
          let yearSelect=addFilter('yearSelect','yearSelectFilter','select',null,null,'Year','selectpicker quickDates',[],years.map(el=>({txt:el.format("YYYY"),id:el.format("YYYY-MM-DD")+"_"+el.endOf('year').format("YYYY-MM-DD")})).reverse(),{})
          let monthSelect=addFilter('monthSelect','monthSelectFilter','select',null,null,'Month','selectpicker quickDates',[],months.map(el=>({txt:el.format("MMM YYYY"),id:el.format("YYYY-MM-DD")+"_"+el.endOf('month').format("YYYY-MM-DD")})).reverse(),{})
          let payMonthSelect=addFilter('payMonthSelect','payMonthSelectFilter','select',null,null,'Pay month','selectpicker quickDates',[],months.map(el=>el.add(1,'months')).map(el=>({txt:el.format("MMM YYYY"),id:el.subtract(1,'months').set('date',14).format("YYYY-MM-DD")+"_"+el.add(1,'months').set('date',13).format("YYYY-MM-DD")})).reverse(),{})
          let goBtn=document.createElement("button")
          let filterRefresh=()=>{
            $(filterElements.stDate).removeClass("invalid")
            $(filterElements.enDate).removeClass("invalid")
            // console.log($(filterElements.stDate).find("input").val(),$(filterElements.enDate).find("input").val())
            if (!$(filterElements.enDate).find("input").is(':visible') || ($(filterElements.stDate).find("input").val() && moment($(filterElements.stDate).find("input").val()).isSameOrBefore($(filterElements.enDate).find("input").val()))) {
              // console.log("is valid")
              let vals=settings.filters
              $('.reportFilter [data-filterField]').each(function(e){
                let v=this.type=='checkbox'?$(this).is(':checked'):$(this).val()
                v=Array.isArray(v)?v.join(","):v
                v=v?v:0
                vals[$(this).attr('data-filterField')]=v
              });
              settings.onRefresh(vals,changed)
              changed=[]
              updateInfo()
            }else {
              // console.log("is invalid")
              $(filterElements.stDate).addClass("invalid")
              $(filterElements.enDate).addClass("invalid")
            }
          }
          $(goBtn).addClass("btn btn-primary submit").html("Update").on("click",filterRefresh)
          $(container).append(goBtn)
          $('body').append(container)
          $(container).draggable({
            cursor: "grabbing",
            drag: function( event, ui ) {
              $(this).css('right','auto');
            }
          });
          $('select[data-filterField]').selectpicker()
          $('select.quickDates').closest('.reportFilter').hide()
          $('select.quickDates').closest('.reportFilter').detach().insertAfter(filterElements.quickDate)
          $('select.quickDates').on('change',function(e){
            if ($(this).val()) {
              filterElements.stDate.find('input').val($(this).val().split("_")[0]).selectpicker('refresh')
              filterElements.enDate.find('input').val($(this).val().split("_")[1]).selectpicker('refresh')
            }
          })
          $('#quickDateFilter').on('change',function(e){
            $('select.quickDates').closest('.reportFilter').hide()
            if ($(this).val()) {
              $('#'+$(this).val()).closest('.reportFilter').show().find('option').eq(1).attr('selected',true).closest('select').selectpicker('refresh').trigger('change')
            }
          })
          $('#onlyRigourHourly #rigourHourly').on('change',function(e){
            $('select.quickDates').closest('.reportFilter').hide()
            if ($(this).val()) {
              $('#'+$(this).val()).closest('.reportFilter').show().find('option').eq(1).attr('selected',true).closest('select').selectpicker('refresh').trigger('change')
            }
          })
          let infoBar=document.createElement("div")
          $(infoBar).attr('id','reportInfo')
          $(infoBar).insertAfter($('.page-title'))
          settings.renderFuncs.forEach((func, i) => {
            func()
          });
          settings.onRendered()
          limitRange()
          updateInfo()
        }
      })
    }
    return this
  }
  $.fn.reportTiles=function(tiles){
    globalDataSources=[]
    function separators(num){
      var num_parts = num.toFixed(2).split(".");
      num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return num_parts.join(".");
    }
    let container=this
    $(container).empty()
    tiles.forEach((params, i) => {
      if (params.preset) {
        params=$.extend(true,reportTilePresets(params.presetParams)[params.preset],params.presetConfig?params.presetConfig:{})
      }
      var settings = $.extend(true,{
        id:'tile-'+Date.now(),
        title: "Untitled",
        visual:{type:'counter',data:0,format:''}
      }, params);
      let tile=document.createElement("div")
      $(tile).addClass('reportTile btn btn-light')
      if (settings.width!=undefined) {
        $(tile).css('width',settings.width)
      }
      let title=document.createElement("div")
      $(title).addClass('reportTileTitle')
      let ddSymbol=document.createElement("div")
      $(ddSymbol).addClass('drilldownSymbol')
      ddSymbol.innerHTML='<i class="fas fa-table"></i>'
      if (settings.drilldown) {
        $(tile).append(ddSymbol)
      }else {
        $(tile).addClass('inactive')
      }
      let visualCont=document.createElement("div")
      $(visualCont).addClass("visual drilldownPage")
      $(tile).append(title)
      $(tile).append(visualCont)
      let reportInfo=document.createElement("div")
      $(reportInfo).addClass('reportTileHoverInfo')
      $(tile).append(reportInfo)
      $(container).append(tile)
      title.innerHTML='<h5>'+settings.title+'</h5>'
      let returnBtn=document.createElement("button")
      $(returnBtn).addClass('reportTileReturnBtn btn btn-light')
      returnBtn.innerHTML='<i class="fas fa-chevron-left"></i>'
      $(title).prepend(returnBtn)
      $(returnBtn).on('click',function(e){
        e.stopPropagation()
        let pages=$(tile).find('.drilldownPage')
        let curr=pages.eq($(this).prop('currentPage'))
        curr.css('left','100%')
        setTimeout(()=>curr.remove(),1000)
        pages.eq($(this).prop('currentPage')-1).css('left','0%')
        $(title).find('h5').find('span').last().remove()
        if ($(this).prop('currentPage')==1) {
          $(tile).addClass("btn btn-light")
        }
        $(this).prop('currentPage',$(this).prop('currentPage')-1)
      })
      let onRendered=()=>{console.log("No render function")}
      let sourceData=[]
      let onRenderedFuncs=[]
      let renderDataSource=(visualSettings,callback)=>{
        if (visualSettings.data.url) {
          let isDataWanted=(e)=>{
            // console.log("Heard new window dataSource.",e,visualSettings.data)
            console.warn("ReportTiles: "+settings.title+" heard new dataSource.",e)
            if (e.detail.url==visualSettings.data.url && _.isEqual(e.detail.params, visualSettings.data.query)) {
              // console.log("New data source is a match!")
              window.removeEventListener('reportTiles-data-loaded',isDataWanted)
              sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(e.detail.data):e.detail.data
              if (Array.isArray(sourceData)) {
                console.warn("ReportTiles: "+settings.title+" rendered from matching source.",e)
                callback(sourceData,status)
              }else {
                console.warn("ReportTiles: AJAX call did not return an array",e.detail.data,sourceData)
              }
            }
          }
          // console.log("Checking window dataSources for "+visualSettings.data.url,globalDataSources,globalDataSources.find(el=>el.url==visualSettings.data.url && _.isEqual(el.params, visualSettings.data.query)))
          let foundSource=globalDataSources.find(el=>el.url==visualSettings.data.url && _.isEqual(el.params, visualSettings.data.query))
          if (foundSource) {
            console.warn("ReportTiles: "+settings.title+" found duplicate dataSource. Pausing render & listening...",visualSettings.data.url,visualSettings.data.query)
            if (foundSource.data.length>0) {
              sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(foundSource.data):foundSource.data
              if (Array.isArray(sourceData)) {
                callback(sourceData,status)
              }else {
                console.warn("ReportTiles: AJAX call did not return an array",foundSource.data,sourceData)
              }
            }else {
              window.addEventListener('reportTiles-data-loaded',isDataWanted)
            }
          }else {
            // console.log("Not found window dataSource. Adding dataSource & rendering...")
            globalDataSources.push({url:visualSettings.data.url,params:visualSettings.data.query,data:[]})
            $.ajax({
              url:visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params),
              global:false,
              data:visualSettings.data.query,
              success:(data,status)=>{
                window.dispatchEvent(new CustomEvent('reportTiles-data-loaded', {detail:{url:visualSettings.data.url,params:visualSettings.data.query,data:data}}))
                console.log("Rendered new dataSource",data)
                sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(data):data
                if (Array.isArray(sourceData)) {
                  // console.log(sourceData)
                  callback(sourceData,status)
                }else {
                  console.warn("ReportTiles: AJAX call did not return an array",data,sourceData)
                }
              },
            })
          }
        }else if (visualSettings.data.promise) {
          let isDataWanted=(e)=>{
            // console.log("Heard new window dataSource.",e,visualSettings.data)
            console.warn("ReportTiles: "+settings.title+" heard new promise dataSource.",e)
            if (e.detail.promise==visualSettings.data.promise && _.isEqual(e.detail.params, visualSettings.data.promiseParams)) {
              // console.log("New data source is a match!")
              window.removeEventListener('reportTiles-promise-loaded',isDataWanted)
              sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(e.detail.data):e.detail.data
              if (Array.isArray(sourceData)) {
                console.warn("ReportTiles: "+settings.title+" rendered from matching promise source.",e)
                callback(sourceData,status)
              }else {
                console.warn("ReportTiles: AJAX call did not return an array",sourceData)
              }
            }
          }
          // console.log("Checking window dataSources for "+visualSettings.data.promise,globalDataSources,globalDataSources.find(el=>el.promise==visualSettings.data.promise && _.isEqual(el.params, visualSettings.data.promiseParams)))
          let foundSource=globalDataSources.find(el=>el.promise==visualSettings.data.promise && _.isEqual(el.params, visualSettings.data.promiseParams))
          if (foundSource) {
            console.warn("ReportTiles: "+settings.title+" found duplicate promise dataSource. Pausing render & listening...",visualSettings.data.promise,visualSettings.data.promiseParams)
            if (foundSource.data.length>0) {
              sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(foundSource.data):foundSource.data
              if (Array.isArray(sourceData)) {
                callback(sourceData,status)
              }else {
                console.warn("ReportTiles: AJAX call did not return an array",sourceData)
              }
            }else {
              window.addEventListener('reportTiles-promise-loaded',isDataWanted)
            }
          }else {
            // console.log("Not found window dataSource. Adding dataSource & rendering...")
            globalDataSources.push({promise:visualSettings.data.promise,params:visualSettings.data.promiseParams,data:[]})
            visualSettings.data.promise(visualSettings.data.promiseParams).then(data=>{
              window.dispatchEvent(new CustomEvent('reportTiles-promise-loaded', {detail:{promise:visualSettings.data.promise,params:visualSettings.data.promiseParams,data:data}}))
              sourceData=visualSettings.data.onResponse?visualSettings.data.onResponse(data):data
              callback(sourceData,'success')
            })
          }
        }else{
          sourceData=visualSettings.data
          callback(visualSettings.data,'success')
        }
      }
      let renderDrilldownAjax=(drilldownSettings,callback)=>{
        $(drilldown).loader()
        $.ajax({
          url:drilldownSettings.data.url+"?"+jQuery.param(drilldownSettings.data.params),
          global:false,
          success:callback,
          complete:()=>$(drilldown).loader("done")
        })
      }
      if (settings.info) {
        let info=document.createElement("span")
        info.innerHTML=' <i class="fas fa-info-circle"></i>'
        $(info).tooltip({
          html:true,
          placement:'right',
          title:settings.info
        })
        $(title).append(info)
      }
      let visuals=Array.isArray(settings.visual)?settings.visual:[settings.visual]
      visuals.forEach((vs, i) => {
        var visualSettings = $.extend(true,{
          type:'counter',data:0,format:'',title:'',calc:v=>v
        }, vs);
        if (visualSettings.data.query || visualSettings.data.promiseParams) {
          let dates=visualSettings.data.query?visualSettings.data.query:visualSettings.data.promiseParams
          reportInfo.innerHTML=moment(dates.stDate).format("DD/MM/YYYY")+" - "+moment(dates.enDate).format("DD/MM/YYYY")
        }
        if (visualSettings.type=='counter') {
          $(visualCont).addClass("counter")
          let visual=document.createElement("span")
          $(visualCont).append(visual)
          $(visual).loader()
          let suffix=document.createElement("span")
          let prefix=document.createElement("span")
          if (visualSettings.format.indexOf('%')>-1) {
            suffix.innerHTML='%'
            $(visualCont).append(suffix)
          }
          onRenderedFuncs.push(()=>{
            let od = new Odometer({
              el: visual,
              value: 0,
              format: '(,ddd).dd'
            });
            renderDataSource(visualSettings,(data,status)=>{
              let val=visualSettings.calc(data)
              let bgColours=chartTargetBGs.slice()
              let colours=chartTargetColours.slice()
              if (visualSettings.targetReverse) {
                bgColours.reverse()
                colours.reverse()
              }
              let bg=bgColours[(val>=0?2:0)]
              let col=colours[(val>=0?2:0)]
              if (visualSettings.targets) {
                bg=bgColours[visualSettings.targets.findIndex(el=>val<el)]
                col=colours[visualSettings.targets.findIndex(el=>val<el)]
              }
              $(visualCont).css('color',col).css('background-color',bg)
              if (visualSettings.format=="+%") {
                if (val>0) {
                  prefix.innerHTML='+'
                  $(visualCont).prepend(prefix)
                }
              }
              od.update(val)
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='spark') {
          $(visualCont).addClass("spark")
          let group=document.createElement("div")
          $(group).addClass("visualGroup")
          let visual=document.createElement("div")
          $(visual).addClass("sparkline")
          let counter=document.createElement("div")
          $(counter).addClass("sparkCounter")
          $(counter).append('<span class="odometer"></span>')
          let title=document.createElement("div")
          $(title).addClass("visualGroupTitle")
          title.innerHTML=visualSettings.title
          $(group).append(visual).append(counter).append(title)
          $(visualCont).append(group)
          $(group).loader()
          let suffix=document.createElement("span")
          let prefix=document.createElement("span")
          if (visualSettings.format.indexOf('%')>-1) {
            suffix.innerHTML='%'
            $(counter).append(suffix)
          }
          if (visualSettings.format.indexOf('£')>-1) {
            prefix.innerHTML='£'
            $(counter).prepend(prefix)
          }
          onRenderedFuncs.push(()=>{
            let od = new Odometer({
              el: $(counter).find('.odometer').eq(0)[0],
              value: 0,
              format: '(,ddd).dd'
            });
            renderDataSource(visualSettings,(data,status)=>{
              $(visual).sparkline(visualSettings.line(data), {
                type: 'line',lineColor: '#b15a79',fillColor:'#b15a794a',spotColor:null,width: '100%',height: '100%',disableInteraction:true,chartRangeMin: 0
              });
              let val=visualSettings.total(data)
              if (visualSettings.format.indexOf('big')>-1) {
                suffix.innerHTML=val>1000000?'m':1000?'k':''
                $(counter).append(suffix)
                let v=val
                if (v>1000) {
                  val=(Math.round((v/1000)*1000)/1000)
                }
                if (v>10000) {
                  val=(Math.round((v/1000)*100)/100)
                }
                if (v>100000) {
                  val=(Math.round((v/1000)*10)/10)
                }
                if (v>1000000) {
                  val=(Math.round((v/1000000)*1000)/1000)
                }
                if (v>10000000) {
                  val=(Math.round((v/1000000)*100)/100)
                }
              }
              if (visualSettings.format=="+%") {
                if (val>=0) {
                  prefix.innerHTML='+'
                  $(counter).prepend(prefix)
                  $(counter).addClass('success')
                }else {
                  $(counter).addClass('danger')
                }
              }
              od.update(val)
              $(group).loader("done")
            })
          })
        }else if (visualSettings.type=='pie') {
          $(visualCont).addClass("pie")
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            labels: [],
            datasets: [{
              data: [],
              backgroundColor:chartColours
            }],
          };
          let config = {
            type: 'pie',
            data: data,
            options: {
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  data[0]._chart.config.data.datasets[0].backgroundColor=data[0]._chart.config.data.datasets[0].backgroundColor.map((el,i)=>i!=data[0]._index?'#ffffff':el)
                  data[0]._chart.update()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                  setTimeout(()=>{
                    data[0]._chart.config.data.datasets[0].backgroundColor=chartColours
                    data[0]._chart.update()
                  },1000)
                }
              },
              legend:{
                display:false
              },
              plugins:{
                datalabels:{
                  formatter:(val,con)=>{
                    return _.truncate(con.chart.data.labels[con.dataIndex]).match(/.{1,12}(\s|$)/g)
                  },
                  font:{
                    family:"'Arial Nova', sans-serif",
                    size:18
                  },
                  color:'white',
                }
              }
            }
          };
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                chart.data.datasets[0].data=visualSettings.calc(data)
                chart.data.labels=visualSettings.labels(data)
                if (visualSettings.format=="%") {
                  chart.options.tooltips.callbacks.label=(e,data)=>e.value+"%"
                }
                chart.update()
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='line') {
          $(visualCont).addClass("line")
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            labels: [],
            datasets: [{
              data: [],
              borderColor:'#630727',
              pointRadius:0,
              pointHitRadius:10,
              pointHoverBackgroundColor:'rgba(99,7,39,0.2)',
              pointHoverBorderColor:'#630727',
              backgroundColor:'rgba(0, 0, 0, 0)',
              pointHoverRadius:5
            }],
          };
          var yAxesticks=[]
          var xAxesticks=[]
          let config = {
            type: 'line',
            data: data,
            options: {
              maintainAspectRatio: false,
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  data[0]._chart.config.data.datasets[0].pointHoverRadius=50
                  data[0]._chart.update()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                  setTimeout(()=>{
                    data[0]._chart.config.data.datasets[0].pointHoverRadius=5
                    data[0]._chart.update()
                  },1000)
                }
              },
              tooltips: {
                callbacks: {
                }
              },
              scales: {
                xAxes: [{
                  display: false,
                  ticks : {
                    beginAtZero : true,
                    callback : function(value,index,values){
                      xAxesticks = values;
                      return value;
                    }
                  }
                }],
                yAxes: [{
                  display: false,
                  ticks : {
                    beginAtZero : true,
                    callback : function(value,index,values){
                      yAxesticks = values;
                      return value;
                    }
                  }
                }],
              },
              plugins: {
                datalabels: {
                  display:false
                }
              },
              legend: {
                display: false,
              },
            }
          };

          if (visualSettings.targets) {
            let targetColours=chartTargetBGs.slice()
            if(visualSettings.targetReverse){
              targetColours.reverse()
            }
            config.options.annotation={
              drawTime: "afterDatasetsDraw",
              annotations: [
              {
                id: 'bottom-box',
                xScaleID: 'x-axis-0',
                yScaleID: 'y-axis-0',
                display: true,
                type: 'box',
                backgroundColor: targetColours[0],
                borderColor: targetColours[0],
                borderWidth: 1,
                yMin:0,
                yMax:visualSettings.targets[0]
              },
              {
                id: 'middle-box',
                xScaleID: 'x-axis-0',
                yScaleID: 'y-axis-0',
                display: true,
                type: 'box',
                backgroundColor: targetColours[1],
                borderColor: targetColours[1],
                borderWidth: 1,
                yMin:visualSettings.targets[0],
                yMax:visualSettings.targets[1]
              },
              {
                id: 'top-box',
                xScaleID: 'x-axis-0',
                yScaleID: 'y-axis-0',
                display: true,
                type: 'box',
                backgroundColor: targetColours[2],
                borderColor: targetColours[2],
                borderWidth: 1,
                yMin:visualSettings.targets[1]
              }]
            }
          }
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                chart.data.datasets[0].data=visualSettings.calc(data)
                chart.data.labels=visualSettings.labels(data)
                if (visualSettings.format=="%") {
                  chart.options.tooltips.callbacks.label=(e,data)=>e.value+"%"
                }
                chart.update()
                var xTop=xAxesticks[xAxesticks.length-1]
                var yTop=yAxesticks[0]
                chart.annotation.elements['top-box'].options.yMax = yTop
                chart.update()
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='bar') {
          $(visualCont).addClass("bar")
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            labels: [],
            datasets: [{
              data: [],
              backgroundColor:chartColours,
              borderColor:chartColours,
            }],
          };
          let config = {
            type: 'bar',
            data: data,
            options: {
              maintainAspectRatio:false,
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  data[0]._chart.config.data.datasets[0].pointHoverRadius=50
                  data[0]._chart.update()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                  setTimeout(()=>{
                    data[0]._chart.config.data.datasets[0].pointHoverRadius=5
                    data[0]._chart.update()
                  },1000)
                }
              },
              tooltips: {
                callbacks: {
                }
              },
              scales: {
                xAxes: [{
                  display: false,
                  stacked:!!visualSettings.stacked
                }],
                yAxes: [{
                  display: false,
                  stacked:!!visualSettings.stacked
                }],
              },
              plugins: {
                datalabels: {
                  anchor:'end',
                  align:'end',
                  clamp:true,
                  padding:1,
                  offset:1,
                  textAlign:'center',
                  formatter:(val,con)=>{
                    val=visualSettings.format=="%"?val+"%":val
                    return _.truncate(con.chart.data.labels[con.dataIndex]+":").match(/.{1,12}(\s|$)/g).concat(val)
                  },
                  color:chartColours,
                  font:{
                    family:"'Arial Nova', sans-serif",
                    size:14
                  },
                }
              },
              legend: {
                display: false,
              },
            }
          };
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                if (visualSettings.stacked) {
                  console.log(visualSettings.calc(data),_.groupBy(visualSettings.calc(data),"group"))
                  let grouped=_.groupBy(visualSettings.calc(data),"group")
                  let bars=visualSettings.labels(data)
                  chart.data.datasets=Object.keys(grouped).map((k,ki)=>{
                    return {
                      label:k,
                      data:bars.map(b=>((grouped[k].find(d=>d.bar==b)||{}).data||0)),
                      backgroundColor:chartColours.map(c=>c+(0.99/(ki+1)).toFixed(2).split(".")[1]),
                      borderColor:chartColours.map(c=>c+(0.99/(ki+1)).toFixed(2).split(".")[1]),
                    }
                  })
                  console.log(chart.data.datasets,bars)
                  // chart.options.scales.yAxes[0].ticks.max=Math.max.apply(null,visualSettings.calc(data).map(el=>el.data))*1.4
                }else {
                  chart.data.datasets[0].data=visualSettings.calc(data)
                  chart.options.scales.yAxes[0].ticks.max=Math.max.apply(null,visualSettings.calc(data))*1.4
                }
                chart.data.labels=visualSettings.labels(data)
                if (visualSettings.format=="%") {
                  chart.options.tooltips.callbacks.label=(e,data)=>e.value+"%"
                }

                chart.options.scales.yAxes[0].ticks.min=0
                chart.update()
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='cloud') {
          $(visualCont).addClass("cloud")
          let visual=document.createElement("div")
          $(visualCont).append(visual)
          $(visualCont).loader()
          onRenderedFuncs.push(()=>{
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                let cloudWords=visualSettings.calc(data)
                let range_max=60
                maxSize = d3.max(cloudWords, function(d) { return d.KeyWordCount; });
                minSize = d3.min(cloudWords, function(d) { return d.KeyWordCount; });
                function drawcloud (range_max) { // declare the function
                  var fontScale = d3.scaleLinear()
                    .domain([minSize, maxSize])
                    .range([8, range_max]); // the argument here

                  var fill = d3.scaleOrdinal().range(chartColours)
                  var layout=d3.layout.cloud().size([$(visualCont).width(), $(visualCont).height()])
                    .words(cloudWords.map(function(d) {
                      return {text: d.Keywords, size: fontScale(d.KeyWordCount)};
                    }))
                    .padding(5)
                    .rotate(function() { return ~~(Math.random() * 5) * 30 - 60; })
                    .font("'Arial Nova', sans-serif")
                    .text(function(d) { return d.text; })
                    .fontSize(function(d) { return d.size })
                    .on("end", function(output) {
                        if (cloudWords.length !== output.length) {  // compare between input ant output
                             drawcloud ( range_max - 5 ); // call the function recursively
                             return undefined;
                        }
                        else { draw(output); }     // when all words are included, start rendering
                     })
                  layout.start();
                  function draw(words) {
                    d3.select(visual).append("svg")
                        .attr("width", layout.size()[0])
                        .attr("height", layout.size()[1])
                      .append("g")
                        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
                      .selectAll("text")
                        .data(words)
                      .enter().append("text")
                        .style("font-size", function(d) { return d.size + "px"; })
                        .style("font-family", "'Arial Nova', sans-serif")
                        .style("fill", function(d, i) {
                              return fill(i);
                            })
                        .attr("text-anchor", "middle")
                        .attr("transform", function(d) {
                          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                        })
                        .text(function(d) { return d.text; })
                        .on('click',function(e){
                          e.stopPropagation()
                          $(tile).removeClass("btn btn-light")
                          renderDrilldownPage(0,visualCont,{x:this.innerHTML},'Keyword:"'+this.innerHTML+'"')
                        })
                  }
                }
                drawcloud(range_max)
              }
              $(visualCont).loader("done")
            })
          })
        }else if (visualSettings.type=='polar') {
          $(visualCont).addClass("polar")
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            labels: [],
            datasets: [{
              data: [],
              backgroundColor:chartColours,
              borderColor:chartColours,
              borderAlign:'inner',
            }],
          };
          let config = {
            type: 'polarArea',
            data: data,
            options: {
              maintainAspectRatio:false,
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  data[0]._chart.config.data.datasets[0].pointHoverRadius=50
                  data[0]._chart.update()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                  setTimeout(()=>{
                    data[0]._chart.config.data.datasets[0].pointHoverRadius=5
                    data[0]._chart.update()
                  },1000)
                }
              },
              layout:{
                padding:3
              },
              scale: {
                display:false,
                // ticks: {
                //   min: -50,
                //   max: 50
                // }
              },
              tooltips:{
                callbacks:{
                }
              },
              legend:{
                display:false
              },
              plugins: {
                datalabels: {
                  anchor:'end',
                  align:'end',
                  clamp:true,
                  padding:1,
                  offset:1,
                  textAlign:'center',
                  formatter:(val,con)=>{
                    return _.truncate(con.chart.data.labels[con.dataIndex]).match(/.{1,13}(\s|$)/g)
                  },
                  font:{
                    family:"'Arial Nova', sans-serif",
                    size:14
                  },
                }
              },
            }
          };
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                chart.data.datasets[0].data=visualSettings.calc(data)
                chart.data.labels=visualSettings.labels(data)
                if (visualSettings.format=="%") {
                  chart.options.tooltips.callbacks.label=(e,data)=>e.value+"%"
                }
                chart.options.scale.ticks.max=Math.max.apply(null,visualSettings.calc(data))*1.4
                chart.options.scale.ticks.min=0
                chart.update()
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='scatter') {
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            datasets: [{
              label: 'Scatter Dataset',
              data: [],
              // pointBackgroundColor:'#630727',
              // pointBorderColor:'#630727',
              trendlineLinear: {
                style: "#630727",
                lineStyle: "dotted|solid",
                width: 2
              }
            }],
          };
          let config = {
            type: 'scatter',
            data: data,
            options: {
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                }
              },
              scales: {
                x: {
                  type: 'linear',
                  position: 'bottom'
                }
              },
              plugins: {
                datalabels: {
                  display:false
                }
              },
              legend: {
                display: false,
              },
            }
          };
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                let scatterData=data.map(el=>({x:el[visualSettings.xField],y:el[visualSettings.yField]}))
                chart.data.datasets[0].data=scatterData
                chart.update(scatterData)
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='bubble') {
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let data={
            labels: [],
            datasets: [{
              // id:0,
              data:[],
              type:'line',
              backgroundColor:'#ffffff00'
            },{
              data:[]
              // id:0,
            }],
          };
          let config = {
            type: 'bubble',
            data: data,
            options: {
              onClick:function(e,data){
                if (data[0]) {
                  e.stopPropagation()
                  let x=data[0]._chart.config.data.labels[data[0]._index]
                  let y=data[0]._chart.config.data.datasets[0].data[data[0]._index]
                  $(tile).removeClass("btn btn-light")
                  renderDrilldownPage(1,visualCont,{x:x,y:y},x)
                }
              },
              maintainAspectRatio: false,
              // responsive:false,
              tooltips: {
                callbacks: {
                }
              },
              scales: {
                xAxes: [{
                  ticks:{
                    callback: function(val, index) {
                      return moment.utc().set('hour',val).format("HH")+":00"
                    },
                  }
                }],
                yAxes: [{
                  display: false,
                }],
              },
              plugins: {
                datalabels: {
                  display:false
                }
              },
              legend: {
                display: false,
              },
            }
          };
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                chart.data.datasets[0].data=visualSettings.calc(data)
                chart.data.datasets[1].data=chart.data.datasets[0].data
                chart.data.labels=visualSettings.labels(data)
                if (visualSettings.format=="%") {
                  chart.options.tooltips.callbacks.label=(e,data)=>e.value+"%"
                }
                if (visualSettings.tooltip) {
                  chart.options.tooltips.callbacks.label=(e,chart)=>{
                    return visualSettings.tooltip(e,chart,data)
                  }
                }
                // chart.options.scales.yAxes[0].ticks.suggestedMax=Math.max.apply(null,visualSettings.calc(data))*1.4
                // chart.options.scales.yAxes[0].ticks.suggestedMin=-1
                chart.update()
              }
              $(visual).loader("done")
            })
          })
        }else if (visualSettings.type=='gauge') {
          let visual=document.createElement("div")
          $(visual).addClass('gaugeCont')
          let group=document.createElement("div")
          $(group).addClass("visualGroup")
          let title=document.createElement("div")
          $(title).addClass("visualGroupTitle")
          title.innerHTML=visualSettings.title
          $(group).append(visual).append(title)
          $(visualCont).append(group)
          $(group).loader()

           onRenderedFuncs.push(()=>{
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                let val=visualSettings.calc(data)
                var valClass=""
                if (visualSettings.reverse) {
                  if (val*0.8>visualSettings.target) {
                    valClass="bad"
                  }else if (val<=visualSettings.target) {
                    valClass="good"
                  }else {
                    valClass="neutral"
                  }
                }else {
                  if (val<visualSettings.target*0.8) {
                    valClass="bad"
                  }else if (val>=visualSettings.target) {
                    valClass="good"
                  }else {
                    valClass="neutral"
                  }
                }
                let gauge=Gauge(
                   visual,
                   {
                     min: (visualSettings.min?visualSettings.min:0),
                     max: (visualSettings.max?visualSettings.max:(visualSettings.softMax?Math.max(visualSettings.softMax,val):100)),
                     dialStartAngle: 180,
                     dialEndAngle: 0,
                     value: 0.00,
                     label: function(val) {
                       return val+(visualSettings.format=="%"?"%":"")
                     },
                     valueClass: visualSettings.target?valClass:'',
                     viewBox: "0 0 100 75",
                     title: visualSettings.title,
                     color: (val)=>chartColours[0]
                   }
                 )
                gauge.setValueAnimated(Math.round(val*100)/100,1.5)
              }
              $(group).loader("done")
            })
          })
        }else if (visualSettings.type=='custom') {
          $(visualCont).addClass("custom")
          let visual=document.createElement("canvas")
          $(visualCont).append(visual)
          $(visual).loader()
          let config = visualSettings.chartConfig
          config.options.maintainAspectRatio=false
          onRenderedFuncs.push(()=>{
            let chart=new Chart(visual, config)
            renderDataSource(visualSettings,(data,status)=>{
              if (data[0]=="<") {
                alert("Could not find URL for "+settings.title+": "+visualSettings.data.url+"?"+jQuery.param(visualSettings.data.params))
              }else {
                visualSettings.onRendered(visualSettings.data,data,chart,renderDrilldownPage)
              }
              $(visual).loader("done")
            })
          })
        }
      });
      $(tile).on('click',(e)=>{
        if ($(tile).hasClass("btn") && settings.drilldown) {
          $(tile).removeClass("btn btn-light")
          renderDrilldownPage(0,visualCont,[])
        }
      })
      function renderDrilldownPage(i,srcPage,srcData,trail){
        let drilldown=document.createElement("div")
        $(drilldown).addClass("drilldown drilldownPage")
        $(tile).append(drilldown)
        if (trail) {
          $(title).find('h5').append("<span> > "+_.truncate(trail)+"</span>")
        }
        let dlBtn=$(document.createElement('button'))
        dlBtn.addClass('btn btn-sm btn-xlsx')
        $(drilldown).append(dlBtn)
        let tableDiv=document.createElement("div")
        $(drilldown).append(tableDiv)
        let ddData=Array.isArray(settings.drilldown[i].data)?settings.drilldown[i].data:(settings.drilldown[i].data?settings.drilldown[i].data(sourceData):sourceData)
        let isnull=(v)=>v==null || v==undefined || !isFinite(v) || isNaN(v/1)
        let ddFormatters={
          '%':cell=>!isnull(cell.getValue())?Math.round(cell.getValue()*100)+"%":'',
          '0.00%':cell=>!isnull(cell.getValue())?(Math.round(cell.getValue()*10000)/100)+"%":'',
          '%+':cell=>!isnull(cell.getValue())?(cell.getValue()>0?'+':'')+Math.round(cell.getValue()*100)+"%":'',
          'd':cell=>cell.getValue()?moment(cell.getValue()).format("DD/MM/YYYY"):'',
          '0.00':cell=>!isnull(cell.getValue())?Math.round(cell.getValue()*100)/100:'',
          '£':cell=>!isnull(cell.getValue())?"£"+separators(cell.getValue(),2):'',
          'yn':cell=>cell.getValue()==1?'Yes':(cell.getValue()==2?'No':'')
        }
        let sorters={
          'd':(a,b,r1,r2,c,d)=>{
            let down=d=='asc'?-1:1
            let up=d=='desc'?1:-1
            return a==b?0:(!a?up:(!b?down:moment(a).valueOf()-moment(b).valueOf()))
          }
        }
        let tab=new Tabulator(tableDiv,{
          data: ddData.filter(el=>settings.drilldown[i].filter(srcData,el)),
          layout:'fitColumns',
          maxHeight:'100%',
          selectable:1,
          columns:settings.drilldown[i].cols(ddData).map(col=>{
            col.sorter=sorters[col.formatter]?sorters[col.formatter]:col.sorter
            col.formatter=ddFormatters[col.formatter]?ddFormatters[col.formatter]:col.formatter
            return col
          }),
          rowFormatter:row=>{
            row.getCells().forEach((cell, i) => {
              let content=$(cell.getElement()).text()
              if (content.length>20) {
                $(cell.getElement()).tooltip({title:content,container:'body'})
              }
            });
          },
          rowSelected:function(row){
            if (settings.drilldown[i+1]) {
              renderDrilldownPage(i+1,drilldown,row.getData(),settings.drilldown[i].trail(row.getData()))
            }else {
              row.deselect()
            }
          },
        })
        dlBtn.click(()=>{
          tab.download("xlsx", $(title).find('h5').text().replaceAll(">","-")+" "+moment().format()+".xlsx")
        })
        $(drilldown).css('left','0%')
        $(srcPage).css('left','-100%')
        $(returnBtn).prop('currentPage',i+1)
        if (settings.drilldown[i].data) {
          if (settings.drilldown[i].data.url) {
            renderDrilldownAjax(settings.drilldown[i],(data,status)=>{
              tab.setColumns(settings.drilldown[i].cols(data))
              tab.setData(data.filter(el=>settings.drilldown[i].filter(srcData,el)))
            })
          }
        }
      }
      $(tile).resizable({
        // alsoResize: ".modal-dialog",
        // minHeight: 520,
        minWidth: 390,
        minHeight: 320,
        // ghost: true
      });
      onRenderedFuncs.forEach((func, i) => {
        func()
      });
    });
    // $(container).sortable({
    //   delay: 150,
    //   placeholder: "ui-state-highlight",
    //   helper: "clone",
    //   opacity: 0.5,
    //   revert: true
    // })
    return this
  }
  $.fn.verticalTable=function(params){
    if (!params) {
      let prop=this.prop('_verticalTable')
      if (!prop) {
        prop=this.find('.verticalTable').prop('_verticalTable')
      }
      return prop
    }else {
      let p=$.extend(true,{
        data:[],
        onRendered:()=>{},
        cols:[],
        rows:[],
        title:'',
        colFilter:el=>el,
        renderCondition:()=>true,
        totalRow:true,
        id:'verticalTable-'+Date.now()
      }, params)
      if (p.cols.length) {
        p.cols=p.cols.map(c=>$.extend(true,{
          filter:(el)=>el,
          title:'Untitled',
          headerFormatter:v=>v
        },c))
      }
      function separators(num,dp){
        var num_parts = (dp?Number(num).toFixed(dp):(Math.round(Number(num)*100)/100).toString()).split(".");
        num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return num_parts.join(".");
      }
      let formatters={
        '%':val=>val!=null?separators(Math.round((val*100)*100)/100)+"%":'',
        'n':val=>val!=null?separators(Math.round(val*100)/100):'',
        '£':val=>val!=null?"£"+separators(val,2):''
      }
      let operators={
        add:(d,v)=>d+v,
        minus:(d,v)=>d-v,
        divide:(d,v)=>d/v,
        multiply:(d,v)=>d*v,
        avg:(d,v)=>d/v
      }
      let dataReductions={
        first:(arr,field)=>arr[0][field],
        sum:(arr,field)=>arr.reduce((a,b)=>a+Number(b[field]),0),
        avg:(arr,field)=>arr.reduce((a,b)=>a+Number(b[field]),0)/arr.length,
        count:(arr,field)=>arr.length,
      }
      let getTableData=()=>{
        let data=[]
        table.find('.rowTitle').each(function(e){
          let row=$(this).prop("data-value")
          row.title=this.innerHTML.replace(/<[^>]*>?/gm, '')
          data.push(row)
        })
        return data
      }
      let fetchData=(config)=>{
        return new Promise((res,rej)=>{
          if (config.url) {
            $.ajax({
              url: config.url,
              global:false,
              data:config.query,
              success:function(resp){
                res(resp)
              },
              error:function(a,b){
                res([])
                console.warn("VerticalTable: Error fetching AJAX",p)
              }
            })
          }else {
            res(config)
          }
        })
      }
      let outerDiv=$(this)
      outerDiv.css('position','relative')
      let container=$(document.createElement("div"))
      container.attr("id",p.id)
      $(container).addClass('verticalTableCont')
      if (p.cols.length) {
        outerDiv.addClass('multiColumn')
      }
      $(this).append(container)
      $(container).loader()
      let tableTitle=$(document.createElement("div"))
      let tableTitleHead=$(document.createElement("h5"))
      tableTitleHead.html(p.title)
      let tableInfo=$(document.createElement("p"))
      tableInfo.html(p.info)
      tableTitle.addClass("table-title").append(tableTitleHead).append(tableInfo)
      let table=$(document.createElement("table"))
      table.addClass("verticalTable")
      table.attr('cellspacing',"0")
      let thead=$(document.createElement("thead"))
      let tbody=$(document.createElement("tbody"))
      let trHead=$(document.createElement("tr"))
      trHead.append(document.createElement("th"))
      if (p.formatterMenu) {
        trHead.append(document.createElement("th"))
      }
      let thTotal=$(document.createElement("th"))
      thTotal.html('Total')
      thTotal.addClass("totalCol")
      trHead.append(thTotal)
      p.cols.forEach((col, i) => {
        let th=$(document.createElement("th"))
        th.html(col.headerFormatter(col.title))
        trHead.append(th)
      });
      thead.append(trHead)
      table.append(thead)
      table.append(tbody)
      let dlBtn=$(document.createElement('button'))
      dlBtn.html("Download to XLSX").addClass('btn btn-sm btn-xlsx')
      fetchData(p.data).then(respData=>{
        let addRow=(origRow)=>{
          let row=$.extend(true,{
            mutator:(v)=>v,
            formatter:'n',
            totalFilter:(el)=>isSqlGroup(el,[]),
            headerFormatter:v=>v
          },origRow)
          row.dataSource=Array.isArray(respData)?respData:respData[row.query]
          // console.log(respData,row.query,row.dataSource)
          if (!row.dataSource && !row.data) {
            console.warn('VerticalTable: Data source is not valid',row)
            row.data={total:NaN,cols:[]}
          }
          if (!row.query && !Array.isArray(respData) && !row.data) {
            console.warn('VerticalTable: Data object given but no query specified',row)
            row.data={total:NaN,cols:[]}
          }
          let rowFormatter=typeof row.formatter=='string'?formatters[row.formatter]:row.formatter
          let rowData={title:row.title,id:row.id,formatter:row.formatter,formatterFunc:rowFormatter,config:row}
          let tr=$(document.createElement("tr")).addClass("table-row")
          if (origRow.cssClass) {
            tr.addClass(origRow.cssClass)
          }
          if (row.display===false) {
            tr.addClass("display-none")
          }
          let tdTitle=$(document.createElement("td"))
          tdTitle.html(row.headerFormatter(row.title))
          tdTitle.addClass("rowTitle")
          tdTitle.attr('calc-mode','row')
          let titleInfo=$(document.createElement("span"))
          if (row.info) {
            titleInfo.tooltip({
              html:true,
              placement:'right',
              title:row.info
            })
            titleInfo.html(' <i class="fas fa-info-circle"></i>')
            tdTitle.append(titleInfo)
          }
          let tdTotal=$(document.createElement("td"))
          tr.append(tdTitle)
          if (p.formatterMenu) {
            let tdFuncs=$(document.createElement("td"))
            let funcSelect=$(document.createElement("select")).addClass("form-control selectpicker").val(row.formatter)
            let funcOpt=(f)=>{
              let opt=$(new Option(f,f))
              if (f==row.formatter) {
                opt.attr('selected',true)
              }
              return opt
            }
            let customFunc=$(new Option('Custom','Custom'))
            customFunc.attr('disabled',true)
            customFunc.attr('selected',(typeof row.formatter!='string'))
            funcSelect.append(customFunc)
            Object.keys(formatters).forEach((f, i) => {
              funcSelect.append(funcOpt(f))
            });
            funcSelect.change(e=>{
              rowData.formatter=funcSelect.find(':selected').val()
              rowData.formatterFunc=formatters[funcSelect.find(':selected').val()]
              rowData.reformat(formatters[funcSelect.find(':selected').val()])
            })
            tdFuncs.append(funcSelect)
            funcSelect.selectpicker()
            if (p.formatterMenu) {
              tr.append(tdFuncs)
            }
          }
          tr.append(tdTotal)
          if (p.formulas) {
            tdTitle.addClass("calculation")
            tdTitle.click(function(e){
              if (!$(outerDiv).hasClass("formula-mode") && tdTitle.find('input').length==0) {
                startCalculation(this)
              }
            })
          }
          tdTotal.addClass("totalCol")
          rowData.totalEl=tdTotal
          rowData.reformat=(formatter)=>{
            rowData.totalEl.html(formatter(rowData.total))
            rowData.cols.forEach((col, i) => {
              col.el.html(formatter(col.val))
            });
          }
          let colTDs=[]
          p.cols.forEach((col, i) => {
            let td=$(document.createElement("td"))
            td.prop('data-col',col)
            colTDs.push(td)
          })
          rowData.setRowData=(newData)=>{
            let valTotal=''
            if (row.data) {
              valTotal=row.data.total
            }else {
              let grouped=newData.filter(row.totalFilter)
              if (row.reduceBy || grouped.length==1) {
                valTotal=dataReductions[(row.reduceBy?row.reduceBy:'first')](grouped,row.field)
              }
            }
            rowData.total=valTotal
            tdTotal.html(rowFormatter(valTotal))
            tdTotal.prop('data-value',valTotal)
            rowData.cols=rowData.cols.map((col, i) => {
              let td=col.el
              let val=''
              if (row.data) {
                let colVal=row.data.cols.find(c=>c.title==col.title)
                val=colVal?colVal.val:NaN
              }else {
                let filter=row.colFilter!=undefined?row.colFilter:p.colFilter
                let grouped=newData.filter(filter).filter(col.config.filter)
                if (row.reduceBy || grouped.length==1) {
                  val=dataReductions[(row.reduceBy?row.reduceBy:'first')](grouped,row.field)
                }
              }
              $(td).html(rowFormatter(val))
              $(td).prop('data-value',val)
              return {title:col.title,val:val,el:td,config:col.config}
            })
          }
          rowData.removeRow=()=>{
            tr.remove()
            tableData=tableData.filter(r=>r.id!=row.id)
          }
          rowData.cols=p.cols.map((col, i) => {
            let td=colTDs[i]
            td.prop('data-row',()=>rowData)
            td.attr("data-col-title",col.title)
            td.attr("data-row-title",rowData.title)
            if (p.cellClick) {
              td.addClass("clickAction")
              td.click(function(e){
                p.cellClick(td,rowData)
              })
            }
            tr.append(td)
            return {title:col.title,val:'',el:td,config:col}
          });
          rowData.setRowData(row.dataSource)
          tdTitle.prop('data-value',rowData)
          tdTotal.attr("data-col-title",'TotalCalc')
          tdTotal.attr("data-row-title",rowData.title)
          if (p.cellClick) {
            tdTotal.addClass("clickAction")
            tdTotal.click(function(e){
              p.cellClick(tdTotal,rowData)
            })
          }
          tbody.append(tr)
          if (row.title=='Calculated row') {
            let titleInput=document.createElement("input")
            titleInput.type='text'
            titleInput.value=tdTitle.html()
            $(titleInput).addClass('title-input')
            tdTitle.html('')
            tdTitle.append(titleInput)
            $(titleInput).focus().select()
            $(titleInput).keyup(function(e) {
              if (e.key === "Enter") {
                tdTitle.html(titleInput.value)
                titleInput.remove()
              }
            });
            $(titleInput).blur(function(e) {
              tdTitle.html(titleInput.value)
              titleInput.remove()
            });
          }
          rowData.rowEl=tr
          outerDiv[0].dispatchEvent(new CustomEvent('verticalTable-row-added', {detail:rowData}))
          return rowData
        }
        let tableData=p.rows.map((row, i) => {
          return addRow(row)
        });
        let setTableData=(newData)=>{
          return fetchData(newData).then(respData=>{
            dataSource=Array.isArray(respData)?respData:respData[row.query]
            getTableData().forEach((row, i) => {
              if (!dataSource && !row.config.data) {
                console.warn('VerticalTable: Data source is not valid',row)
              }else if (!row.config.query && !Array.isArray(respData) && !row.config.data) {
                console.warn('VerticalTable: Data object given but no query specified',row)
              }else {
                if ($(row.rowEl).hasClass("totalRow")) {
                  row.removeRow()
                }else {
                  row.setRowData(dataSource)
                }
              }
            });
            addTotalRow()
          })
        }
        let createCalculator=(calcMode)=>{
          let cControl=$(document.createElement("div"))
          cControl.addClass('formulaContainer')
          let addRadio=(val,label)=>{
            let rad=document.createElement("input")
            rad.type='radio'
            rad.name='formula-calculation'
            rad.id='formula-radio-'+val
            rad.value=val
            rad.style.display='none'
            let lab=document.createElement("label")
            $(lab).attr('for','formula-radio-'+val)
            lab.innerHTML=label
            $(lab).addClass('btn btn-secondary disabled calcButton')
            var docFragment = document.createDocumentFragment();
            docFragment.appendChild(rad);
            docFragment.appendChild(lab);
            return docFragment.children
          }
          let cAdd=addRadio('add','<i class="fas fa-plus"></i>')
          let cMinus=addRadio('minus','<i class="fas fa-minus"></i>')
          let cDivide=addRadio('divide','<i class="fas fa-divide"></i>')
          let cMultiply=addRadio('multiply','<i class="fas fa-times"></i>')
          let cAvg=addRadio('avg','AVG')
          let formulaDisplay=$(document.createElement("div"))
          formulaDisplay.addClass("formula-display")
          let runFormula=$(document.createElement("button"))
          runFormula.addClass("btn btn-primary")
          runFormula.html('<i class="fas fa-equals"></i>')
          runFormula.prop('disabled',true)
          runFormula.click(()=>{
            updateDisplay(doFormula((el)=>$(el).prop('data-value')))
          })
          let runRowFormula=$(document.createElement("button"))
          runRowFormula.addClass("btn btn-primary")
          runRowFormula.html('<i class="fas fa-equals"></i>')
          runRowFormula.prop('disabled',true)
          runRowFormula.click(()=>{
            formulateRow()
            endCalculation()
          })
          let goBtn
          if (calcMode=='simple') {
            goBtn=runFormula
          }else {
            goBtn=runRowFormula
          }
          goBtn.addClass('runFormulaBtn')
          cControl.append(formulaDisplay,cAdd,cMinus,cDivide,cMultiply,cAvg,goBtn)
          return cControl
        }
        let updateDisplay=(result)=>{
          let str=""
          let dividends=[]
          let divisors=[]
          $('.formulas-dividend').each(function(e){
            if ($(this).prop('data-value').title) {
              dividends.push("'"+$(this).prop('data-value').title+"'")
            }else {
              if (isNaN($(this).prop('data-value'))) {
                dividends.push(0)
              }else {
                dividends.push(Number($(this).prop('data-value')))
              }
            }
          })
          if ($(outerDiv).find('input[name="formula-calculation"]:checked').val()=='avg') {
            divisors=[$('.formulas-dividend').length]
          }else {
            $('.formulas-divisor').each(function(e){
              if ($(this).prop('data-value').title) {
                divisors.push("'"+$(this).prop('data-value').title+"'")
              }else {
                if (isNaN($(this).prop('data-value'))) {
                  divisors.push(0)
                }else {
                  divisors.push(Number($(this).prop('data-value')))
                }
              }
            })
          }
          if (dividends.length>0) {
            str="<span class='dividendsDisplay'>("+dividends.join("+")+")</span>"
          }
          let symbols={
            add:'+',
            minus:'-',
            divide:'/',
            multiply:'*',
            avg:'/',
          }
          if ($(outerDiv).find('input[name="formula-calculation"]:checked').val()) {
            str=str+symbols[$(outerDiv).find('input[name="formula-calculation"]:checked').val()]
          }
          if (divisors.length>0) {
            str=str+"<span class='divisorsDisplay'>("+divisors.join("+")+")</span>"
          }
          if (result!=undefined && result!=null) {
            str=str+"=<span class='resultDisplay'>"+result+"</span>"
          }
          $('.formula-display').html(str)
        }
        let doFormula=(getVal)=>{
          let dividend=0
          let divisor=0
          $('.formulas-dividend').each(function(e){
            if (!isNaN(getVal(this))) {
              dividend=dividend+Number(getVal(this))
            }
          })
          if ($(outerDiv).find('input[name="formula-calculation"]:checked').val()=='avg') {
            divisor=$('.formulas-dividend').length
          }else {
            $('.formulas-divisor').each(function(e){
              if (!isNaN(getVal(this))) {
                divisor=divisor+Number(getVal(this))
              }
            })
          }
          // console.log(dividend,divisor,$(outerDiv).find('input[name="formula-calculation"]:checked'))
          return operators[$(outerDiv).find('input[name="formula-calculation"]:checked').val()](dividend,divisor)
        }
        let calculateRow=(row,customSorter)=>{
          let allRows=[]
          $('.verticalTable').each(function(e){
            allRows=allRows.concat($(this).verticalTable().getData())
          })
          // console.log("AllRows: ",allRows.map(el=>el.id).join(","))
          // console.log("Calculating row: ",row)
          if ((row.divisors.every(d=>allRows.find(el=>el.id==d)) || !isNaN(row.divisors[0]/1)) && (row.dividends.every(d=>allRows.find(el=>el.id==d)) || !isNaN(row.dividends[0]/1))) {
            let divisorRows=allRows.filter(el=>row.divisors.includes(el.id))
            let dividendRows=allRows.filter(el=>row.dividends.includes(el.id))
            let srcRow=dividendRows[0]
            let calcRow={cols:[]}
            calcRow.total=operators[row.operator](isNaN(row.dividends[0]/1)?dividendRows.reduce((a,b)=>a+b.total,0):row.dividends[0],isNaN(row.divisors[0]/1)?divisorRows.reduce((a,b)=>a+b.total,0):row.divisors[0])
            srcRow.cols.forEach((col, i) => {
              let dividends=dividendRows.map(r=>r.cols.filter(c=>c.title==col.title)).flat()
              let divisors=divisorRows.map(r=>r.cols.filter(c=>c.title==col.title)).flat()
              // console.log(row,col,dividends,divisors,isNaN(row.dividends[0]/1)?dividends.reduce((a,b)=>a+b.val,0):row.dividends[0],isNaN(row.divisors[0]/1)?divisors.reduce((a,b)=>a+b.val,0):row.divisors[0])
              calcRow.cols[i]={
                title:col.title,
                val:operators[row.operator]((isNaN(row.dividends[0]/1)?dividends.reduce((a,b)=>a+b.val,0):row.dividends[0]),isNaN(row.divisors[0]/1)?divisors.reduce((a,b)=>a+b.val,0):row.divisors[0])
              }
            });
            row.formatter=row.formatter?row.formatter:srcRow.formatter
            row.data=calcRow
            let newRow=addRow(row)
            console.log('calculated '+row.title)
            sortRows(customSorter)
            return newRow
          }else {
            console.warn("Could not find dividend row(s) ("+row.dividends.filter(d=>!allRows.find(el=>el.id==d))+") or divisor row(s) ("+row.divisors.filter(d=>!allRows.find(el=>el.id==d))+") when calculating "+row.title+". Listening for creation...")
            addRowListener(row)
            return
          }
        }
        let addTotalRow=()=>{
          let allRows=getTableData()
          let row=allRows[0]
          row.cols=row.cols.map(el=>{
            el.val=allRows.reduce((a,b)=>a+Number(checkFind(b.cols.find(c=>c.title==el.title)).val),0)
            return el
          })
          row.total=allRows.reduce((a,b)=>a+Number(b.total),0)
          row.data={total:row.total,cols:row.cols}
          row.title="Total"
          row.cssClass="totalRow"
          let newRow=addRow(row)
          $(newRow.rowEl).find("th").attr("data-row-title","TotalCalc")
          $(newRow.rowEl).find("td").attr("data-row-title","TotalCalc")
          console.log("totalRow adding")
          return newRow
        }
        let calculateTotals=()=>{

        }
        let addRowListener=(forRow)=>{
          let func=(e)=>{
            // console.log(e.detail.id+' created. '+forRow.title+" has heard.")
            if (forRow.dividends.includes(e.detail.id) || forRow.divisors.includes(e.detail.id)) {
              // console.log("ID is relevant to calc row. Recalculating...")
              let arr=outerDiv.prop("rowListeners")
              arr.splice(arr.indexOf(forRow), 1)
              outerDiv.prop("rowListeners",arr)
              calculateRow(forRow)
            }
          }
          if (outerDiv.prop("rowListeners")) {
            if (!outerDiv.prop("rowListeners").includes(forRow)) {
              outerDiv[0].addEventListener('verticalTable-row-added',func,{once:true})
              outerDiv.prop("rowListeners",outerDiv.prop("rowListeners").concat(forRow))
            }
          }else {
            let arr=[]
            outerDiv[0].addEventListener('verticalTable-row-added',func,{once:true})
            arr.push(forRow)
            outerDiv.prop("rowListeners",arr)
          }
        }
        let formulateRow=()=>{
          let srcRow=$('.formula-source').prop('data-value')
          let calcRow={cols:[]}
          calcRow.total=doFormula((el)=>$(el).prop('data-value').total)
          srcRow.cols.forEach((col, i) => {
            calcRow.cols[i]={
              title:col.title,
              val:doFormula((el)=>($(el).prop('data-value').cols[i]?$(el).prop('data-value').cols[i].val:0))
            }
          });
          let rowObj={id:'calc-'+Date.now(),title:'Calculated row',formatter:srcRow.formatter,data:calcRow}
          tableData.push(addRow(rowObj))
        }
        let startCalculation=(el)=>{
          let calcMode=$(el).attr('calc-mode')
          let cControl=createCalculator(calcMode)
          outerDiv.append(cControl)
          cControl.draggable({
            cursor: "grabbing",
            drag: function( event, ui ) {
              // $(this).css('right','auto');
            }
          });
          cControl.css('opacity',0)
          cControl.css('left',el.getBoundingClientRect().left+$(el).width()+"px")
          cControl.css('top',el.getBoundingClientRect().top+"px")
          cControl.css('opacity',1)
          $(el).addClass("formulas-dividend formula-source")
          $(outerDiv).addClass("formula-mode dividend-mode")
          $(outerDiv).find('.verticalTable').addClass("dividend-mode")
          $(document).keyup(function(e) {
            if (e.key === "Escape") {
              endCalculation()
            }
          });
          $(outerDiv).on('click','.dividend-mode .calculation[calc-mode="'+calcMode+'"]',function(e){
            $(this).addClass("formulas-dividend")
            $(outerDiv).find('.formulaContainer label').removeClass('disabled')
            updateDisplay()
          })
          $(outerDiv).on('click','.divisor-mode .calculation[calc-mode="'+calcMode+'"]',function(e){
            $(this).addClass("formulas-divisor")
            cControl.find('.runFormulaBtn').prop('disabled',false)
            updateDisplay()
          })
          $(outerDiv).on('change','input[name="formula-calculation"]',function(e){
            $(outerDiv).find('.formulaContainer label').addClass('disabled')
            $(outerDiv).removeClass("dividend-mode")
            $(outerDiv).addClass("divisor-mode")
            $(outerDiv).find('.verticalTable').removeClass("dividend-mode")
            $(outerDiv).find('.verticalTable').addClass("divisor-mode")
            updateDisplay()
            if ($(outerDiv).find('input[name="formula-calculation"]:checked').val()=='avg') {
              cControl.find('.runFormulaBtn').click()
            }
          })
          updateDisplay()
        }
        let endCalculation=()=>{
          let calcMode=$('.formula-source').attr("calc-mode")
          $(outerDiv).off('click','.dividend-mode .calculation[calc-mode="'+calcMode+'"]')
          $(outerDiv).off('click','.divisor-mode .calculation[calc-mode="'+calcMode+'"]')
          $(outerDiv).off('change','input[name="formula-calculation"]')
          $('.formulaContainer').remove()
          $(outerDiv).removeClass("formula-mode divisor-mode")
          $(outerDiv).find('.verticalTable').removeClass("formula-mode divisor-mode")
          $(outerDiv).find('td').removeClass('formulas-divisor formulas-dividend formula-source')
        }
        let sortRows=(sorter)=>{
          let data=getTableData()
          let arraySort=(sorter)=>sorter.map(id=>data.find(el=>el.id==id)).filter(el=>el)
          let sorterFunc=Array.isArray(sorter)?arraySort:data.sort
          let sorted=sorter?sorterFunc(sorter):data
          table.find('.table-row').detach()
          sorted.forEach((tr, i) => {
            tbody.append(tr.rowEl)
          });
          return sorted
        }
        let renderXLSXworksheet=()=>{
          let data=getTableData()
          let json=data.map(row=>{
            let obj={}
            obj[" "]=row.title
            obj["Total"]=(isNaN(row.total)/1 || !isFinite(row.total)?'':row.formatterFunc(row.total))
            row.cols.forEach((col, i) => {
              obj[col.title]=(isNaN(col.val)/1 || !isFinite(col.val)?'':row.formatterFunc(col.val))
            });
            console.log(obj)
            return obj
          })
          let ws=XLSX.utils.json_to_sheet(json, {header:[" ","Total"].concat(data[0].cols.map(c=>c.title))})
          // formatXLSXColumn(ws,2,"£0.00")
          const range = XLSX.utils.decode_range(ws['!ref'])
          for (var row = range.s.r+1; row <= range.e.r; ++row) {
            const fieldRef = XLSX.utils.encode_cell({ r: row, c: 1 })
            for (var col = range.s.c+1; col <= range.e.c; ++col) {
              const ref = XLSX.utils.encode_cell({ r: row, c: col })
              if (ws[ref] && ws[ref].t === 's') {
                if (ws[ref].v.toString().indexOf("£")>-1) {
                  ws[ref].v=parseFloat(Number(ws[ref].v.replace(/[^0-9.-]+/g,"")))
                  ws[ref].z = "\£#,##0.00"
                  ws[ref].t = "n"
                }else if (ws[ref].v.toString().indexOf("%")>-1) {
                  ws[ref].v=Number(ws[ref].v.replace(/[^0-9.-]+/g,""))/100
                  ws[ref].z = "0.00%"
                  ws[ref].t = "n"
                }
              }
            }
          }
          return ws
        }
        let getXLSXworksheet=()=>{
          return renderXLSXworksheet()
        }
        let downloadXLSX=(title)=>{
          let wb=XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb,renderXLSXworksheet())
          return XLSX.writeFile(wb, (title?title:'untitled'), {})
        }
        dlBtn.click(()=>{
          XLSX.writeFile(downloadXLSX(document.title+" "+p.id+" "+moment().format()+'.xlsx'))
        })
        if (!p.renderCondition(tableData)) {
          container.remove()
          return false
        }
        container.append(tableTitle).append(dlBtn).append(table)
        $('.button-default.xlsx').addClass("btn btn-sm btn-xlsx")
        $(container).loader("done")
        let _verticalTable={
          getData:getTableData,
          setData:setTableData,
          remove:()=>outerDiv.empty(),
          calculateRow:calculateRow,
          config:p,
          sortRows:sortRows,
          getXLSXworksheet:getXLSXworksheet,
          download:downloadXLSX
        }
        container.prop('_verticalTable',_verticalTable)
        table.prop('_verticalTable',_verticalTable)
        if (p.totalRow) {
          console.log("totalRow called")
          addTotalRow()
        }
        p.onRendered(tableData,_verticalTable)
        window.dispatchEvent(new CustomEvent('verticalTable-rendered', {detail:table}))
        return _verticalTable
      })
    }
  }
  $.fn.ganttChart=function(params){
    let settings=$.extend(true,{
      container:this[0],
      tableSettings:{},
    }, params)
    let ganttClick=function(e,cell){
      let thisDate=moment(cell.getField().split("_")[1])
      if ($(cell.getRow().getElement()).hasClass("editing")) {
        let stDate=moment(cell.getRow().getCells().find(el=>$(el.getElement()).hasClass("selected")).getField().split("_")[1])
        if (stDate<=thisDate) {
          cell.getRow().update({startDate:stDate.format("YYYY-MM-DD"),endDate:thisDate.format("YYYY-MM-DD")})
        }else {
          cell.getRow().reformat()
        }
        $('.tabulator-cell.selected').removeClass("selected")
        $('.tabulator-cell.editing').removeClass("editing")
        $('.tabulator-row.editing').removeClass("editing")
        $(document).off('mousemove')
      }else {
        $(cell.getElement()).addClass("selected")
        $(cell.getRow().getElement()).addClass("editing")
        cell.getRow().getCells().filter(el=>el.getField().indexOf('calDate')>-1).forEach((rcell, i) => {
          $(rcell.getElement()).css("background","initial")
          if (moment(rcell.getField().split("_")[1])>thisDate) {
            $(rcell.getElement()).addClass("editing")
          }
        });
        $(document).on('mousemove',function(e){
          let x=e.pageX
          cell.getRow().getCells().filter(el=>$(el.getElement()).hasClass("editing")).forEach((rcell, i) => {
            if (x>rcell.getElement().getBoundingClientRect().left) {
              $(rcell.getElement()).addClass("newDate")
            }else {
              $(rcell.getElement()).removeClass("newDate")
            }
          })
        })
      }
    }
    function makeInterval(arr,startField,newName,end,isEnd){
      if (isEnd) {
        let en=arr.find(el=>el.dateName==startField)
        let stDate=moment(addBusinessDays(st.dateValue, end)).format("YYYY-MM-DD")
        if (en) {
          let newEv=en
          newEv.dateName=newName
          newEv.endDate=newEv.dateValue
          newEv.dateValue=stDate
          arr.splice(arr.indexOf(en),1,newEv)
        }
      }else {
        let st=arr.find(el=>el.dateName==startField)
        let en=arr.find(el=>el.dateName==end)
        if (en) {
          arr.splice(arr.indexOf(en),1)
        }
        if (st) {
          let endDate=en?en.dateValue:moment(addBusinessDays(st.dateValue, end)).format("YYYY-MM-DD")
          let newEv=st
          newEv.dateName=newName
          newEv.endDate=endDate
          arr.splice(arr.indexOf(st),1,newEv)
        }
      }
      return arr
    }
    let dateVals
    let st
    let en
    let tableSettings=$.extend(true,{
      ajaxURL:'/get-project-dates/'+projectID,
      ajaxResponse:(url,params,response)=>{
        dateVals=response.filter(el=>el.dateValue).map(el=>new Date(el.dateValue))
        st=moment(Math.min.apply(null,dateVals))
        en=moment(Math.max.apply(null,dateVals))
        response=makeInterval(response,'Pilot start','Fieldwork pilot','Pilot end')
        response=makeInterval(response,'Field start','Fieldwork','Field end')
        response=makeInterval(response,'Scripting','Scripting',2)
        response=makeInterval(response,'Tabs','Data & Tabs creation',-3,true)
        if (en.diff(st,'d')>300) {
          alert("Cannot show dates chart, the period between earliest and latest date is too large.")
        }
        response=response.map(task=>{
          let obj={}
          obj.projectID=projectID
          obj.dateID=task.dateID
          obj.dateName=task.dateName
          obj.datePos=task.datePos
          let taskSt=new Date(task.dateValue).getTime()
          let taskEn=new Date(task.endDate).getTime()
          obj.startDate=task.dateValue
          obj.endDate=task.endDate
          let thisDte=new Date(task.dateValue)
          if (en.diff(st,'d')<300) {
            for (var i = 0; i <= Math.ceil(en.diff(st,'d')); i++) {
              thisDte.setDate(thisDte.getDate() + 1);
              if ((!task.endDate && thisDte.getTime()==taskSt) || (thisDte.getTime()>=taskSt && thisDte.getTime()<=taskEn)) {
                obj['calDate_'+moment(thisDte).format("YYYY-MM-DD")]=true
              }
            }
          }
          return obj
        })
        return response
      },
      autoColumns:true,
      autoColumnsDefinitions:defs=>{
        let ganttCols=[
          {field:'',frozen:true,formatter:addRemIcon, width:25, hozAlign:"center", cellClick:addRemProjectGanttClick, cssClass:'addRemCol'},
          {field:'datePos',frozen:true,visible:false},
          {field:'dateName',frozen:true, editor:"input",title:'',cssClass:'ganttTask',width:150},
          {field:'startDate',frozen:true, editor:dateTimeEditor,title:'',cssClass:'ganttTask',width:60,formatter:cell=>cell.getValue()?moment(cell.getValue()).format("DD/MMM"):'TBC'},
          {field:'endDate',frozen:true, editor:dateTimeEditor,title:'',cssClass:'ganttTask',width:60,formatter:cell=>cell.getValue()?moment(cell.getValue()).format("DD/MMM"):(cell.getData().startDate?moment(cell.getData().startDate).format("DD/MMM"):'TBC')},
          {formatter:tbcIcon,frozen:true, field:"dateNA", width:40, hozAlign:"center", cellClick:tbcClick, cssClass:'naCol'},
        ]
        st=moment(Math.min.apply(null,dateVals))
        en=moment(Math.max.apply(null,dateVals))
        if (en.diff(st,'d')<300) {
          for (var i = 0; i <= Math.ceil(en.diff(st,'d')/7); i++) {
            let mon=moment(st).add(i,'w').isoWeekday(1)
            let ganttWeek=[]
            for (var x = 0; x <= 4; x++) {
              let d=moment(mon).add(x,'d')
              ganttWeek.push({field:'calDate_'+d.format("YYYY-MM-DD"),title:d.format("dd"),width:25,cssClass:(d.isSame(moment(),'d')?'ganttToday':'ganttCell'),cellClick:ganttClick,formatter:cell=>'',mutator:(val,data)=>(d.valueOf()>=moment(data.startDate).valueOf() && d.valueOf()<=moment(data.endDate?data.endDate:data.startDate).valueOf())})
            }
            ganttCols.push({title:'w/c '+mon.format("DD/MM/YY"),columns:ganttWeek})
          }
        }
        return ganttCols
      },
      autoResize:false,
      layout:"fitColumns",
      headerSort:false,
      movableRows: true,
      rowFormatter:(row)=>{
        if (row.getData().dateID==-1) {
          row.getElement().style.backgroundColor = "rgb(255 255 255)";
          row.getElement().style['box-shadow'] = "rgb(102 142 212 / 33%) 0px 0px 20px 8px inset";
          row.getElement().style['color'] = "#253ace";
          row.getElement().style['margin-top']= "10px";
        }else {
          row.getElement().style.backgroundColor = "initial";
          row.getElement().style['box-shadow'] = "none";
          row.getElement().style['color'] = "initial";
          row.getElement().style['margin-top']= "initial";
          row.getCells().filter(cell=>cell.getField().indexOf('calDate')>-1).forEach((cell, i) => {
            if (cell.getValue()) {
              $(cell.getElement()).css("background","var(--primary)")
            }else {
              $(cell.getElement()).css("background","initial")
            }
          });
        }
      },
      rowMoved:function(row){
        row.getTable().getRows().forEach((row2, i) => {
          if (row2.getData().dateID>-1) {
            row2.update({datePos:row2.getPosition(true)})
          }
        });
      },
      rowUpdated:function(row){
        row.reformat()
      },
      dataLoaded:function(data){
        this.addRow({dateID:-1, projectID:projectID, dateName: "", startDate: "", note: "", datePos:9999}, false).then(this.setSort("datePos", "asc"))
        let table=this
      },
      cellEdited:function(cell){
        let data=cell.getData()
        let obj={}
        cell.getRow().getCells().filter(cell=>cell.getField().indexOf('calDate')>-1).forEach((cell2, i) => {
          let d=moment(cell2.getField().split("_")[1])
          if (d.valueOf()>=moment(data.startDate).valueOf() && d.valueOf()<=moment(data.endDate?data.endDate:data.startDate).valueOf()) {
            obj[cell2.getField()]=true
          }else {
            obj[cell2.getField()]=false
          }
        });
        cell.getRow().update(obj).then(e=>{
          cell.getRow().reformat()
        })

      }
    },settings.tableSettings)
    const datesGantt = new Tabulator(settings.container,tableSettings)
  },
  $.fn.forstaAgentMatchup=function(params){
    let settings=$.extend(true,{
      container:this[0],
      missingList:[],
      onCellMatched:()=>{},
      onClose:()=>{},
      footer:"Close this popup to continue."
    }, params)
    let matchupDiv=document.createElement("div")
    matchupDiv.style.width="100%"
    let matchup
    $.ajax("/forsta-agents").done(agents=>{
      $.ajax("/all-agents-raw").done(jAgents=>{
        $().getModal({
          title:"Missing agents",
          body:matchupDiv,
          footer:"Close this popup to continue.",
          onLoad:()=>{
            let listVals=jAgents.map(a=>({value:a.agentID,label:a.agentName}))
            console.log("agents",listVals,agents,settings.missingList)
            matchup=new Tabulator(matchupDiv,{
              data:settings.missingList.map(a=>({forstaID:a,agentID:null})),
              // layout:"fitColumns",
              columns:[
                {field:"forstaID",title:"Forsta Interviewer ID",formatter:c=>{
                  return (agents.find(g=>g.InterviewerId==c.getValue())||{Name:c.getValue()}).Name
                }},
                {field:"agentID",title:"JA2 Agent Name",cellEdited:c=>{
                  settings.onCellMatched(c)
                  $.ajax({method:"POST",url:"/save-live-report-names",data:{type:"ForstaAgent",id:c.getValue(),vistaName:c.getData().forstaID}})
                },editor:"list",editorParams:{values:listVals,multiselect:false,clearable:true,autocomplete:true,freetext:false,listOnEmpty:true}}
              ]
            })
            document.addEventListener("visibilitychange", () => {
              if (!document.hidden) {
                matchup.redraw(true)
              }
            });
          },
          onClose:()=>{
            settings.onClose(matchup.getData())
          }
        })
      })
    })
  },
  $.fn.forstaJobMatchup=function(params){
    let settings=$.extend(true,{
      container:this[0],
      missingList:[],
      onCellMatched:()=>{},
      onClose:()=>{},
      footer:"Close this popup to continue. Any unmatched jobs will not be shown on the report"
    }, params)
    let matchupDiv=document.createElement("div")
    matchupDiv.style.width="100%"
    let matchup
    $.ajax("/get-forsta-surveys").done(surveys=>{
      $.ajax("/forsta-groups").done(groups=>{
        $.ajax("/all-jobs-raw").done(jJobs=>{
          $().getModal({
            title:"Missing jobs",
            body:matchupDiv,
            footer:settings.footer,
            onLoad:()=>{
              let listVals=jJobs.map(a=>({value:a.jobID,label:a.jobName}))
              console.log(groups,listVals,settings.missingList)
              matchup=new Tabulator(matchupDiv,{
                data:settings.missingList.map(a=>({forstaID:a.SurveyId,GroupId:a.GroupId,jobID:null})),
                // layout:"fitColumns",
                columns:[
                // {field:"forstaID",title:"Forsta Survey",formatter:c=>(surveys.find(g=>g.id==c.getValue())||{name:c.getValue()}).name},
                {field:"GroupId",title:"Forsta Group",formatter:c=>{
                  console.log(c.getValue(),groups.find(g=>g.GroupId==c.getValue()))
                  return (groups.find(g=>g.GroupId==c.getValue())||{Name:c.getValue()}).Name}
                },
                {field:"jobID",title:"JA2 Job Name",cellEdited:c=>{
                  settings.onCellMatched(c)
                  $.ajax({method:"POST",url:"/save-live-report-names",data:{type:"Job",id:c.getValue(),forstaGroupID:c.getData().GroupId,vistaName:c.getData().forstaID}})
                },editor:"list",editorParams:{values:listVals,multiselect:false,clearable:true,autocomplete:true,freetext:false,listOnEmpty:true}}
                ]
              })
              document.addEventListener("visibilitychange", () => {
                if (!document.hidden) {
                  matchup.redraw(true)
                }
              });
            },
            onClose:()=>{
              settings.onClose(matchup.getData())
            }
          })
        })
      })
    })
  }
  $.fn.forstaUniqueLinks=function(params){
    let settings=$.extend(true,{
      container:this[0],
      pid:"",
    }, params)
    if (!settings.pid) {
      $().forstaSurveySelector({
        onSelected:pid=>$().forstaUniqueLinks({pid:pid})
      })
      return false
    }
    $.ajax("/get-forsta-survey-questions?respondentOnly=true&pid="+settings.pid).then(questions=>{
      let newInput=()=>{
        let row=document.createElement("div")
        row.classList.add("questionRow")
        $(row).css({
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "margin-bottom": "7px",
        })
        let question=document.createElement("div")
        question.style.width="45%"
        row.append(question)
        VirtualSelect.init({
          ele: question,
          options:questions.filter(q=>!q.field&&!q.levelPath&&!q.isSystemVariable&&!q.isCompound).map(q=>({description:getForstaTitle(q),label:q.name,value:q.name,customData:q})),
          hasOptionDescription:true,
          search:true,
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
        question.onchange=()=>{
          let code
          $(row).find(".questionValue").remove()
          let variable=question.getSelectedOptions().customData
          if (variable.options) {
            code=document.createElement("div")
            code.classList.add("questionValue")
            VirtualSelect.init({
              ele: code,
              search:true,
              options:variable.options.map(q=>({label:getForstaTitle(q),value:q.code,customData:q})),
              optionsCount:10,
              dropboxWidth:"400px",
              disableOptionGroupCheckbox:true,
            });
          }else{
            code=document.createElement("input")
            code.classList.add("questionValue","form-control")
            code.type=variable.variableType=="text"?"text":"number"
          }
          code.onchange=function(e){
            if (code.value) {
              code.classList.remove("invalid")
            }else {
              code.classList.add("invalid")
            }
          }
          code.style.width="45%"
          $(code).attr("data-field",question.value)
          question.after(code)
          setTimeout(()=>{
            if (code.open) {
              code.open()
            }
            code.focus()
          },100)
        }
        let remBtn=document.createElement("button")
        remBtn.classList.add("btn","btn-sm","btn-white")
        remBtn.innerHTML='<i class="fa-solid fa-trash-can"></i>'
        remBtn.onclick=function(){
          row.remove()
        }
        row.append(remBtn)
        setTimeout(()=>{
          question.open()
          question.focus()
        },100)
        return row
      }
      let codingCont=document.createElement("div")
      let addBtn=document.createElement("button")
      addBtn.classList.add("btn","btn-sm","btn-secondary")
      addBtn.style.width="100%"
      addBtn.innerHTML="Add a field"
      addBtn.onclick=function(){
        addBtn.before(newInput())
      }
      codingCont.append(addBtn)
      let nofLinks=document.createElement("input")
      nofLinks.type="number"
      nofLinks.classList.add("form-control")
      nofLinks.style.marginTop="10px"
      nofLinks.placeholder="Number of links to create..."
      codingCont.append(nofLinks)
      let validate=()=>{
        let isValid=true
        $(codingCont).find(".questionValue").each(function(e){
          if (!this.value) {
            this.classList.add("invalid")
            isValid=false
          }
        })
        if (!nofLinks.value) {
          nofLinks.classList.add("invalid")
          isValid=false
        }
        if ($(".questionValue").length==0) {
          isValid=false
          if (confirm("You haven't coded anything up - it is suggested that you at least code the sample source. Continue with no coding?")) {
            isValid=true
          }
        }
        return isValid
      }
      let submitBtn=document.createElement("button")
      submitBtn.classList.add("btn","btn-primary")
      submitBtn.innerHTML="Create links"
      submitBtn.onclick=function(e){
        if (validate()) {
          let fields={}
          $(".questionValue").each(function(e){
            fields[$(this).attr("data-field")]=this.value
          })
          $.ajax({url:"/add-forsta-respondents",method:"post",data:{
            pid:settings.pid,
            dataTemplate:fields,
            dataRepeats:nofLinks.value
          }}).done(e=>{
            console.log("Received records",e)
            let headers=["respid","SurveyLink"].concat(Object.keys(fields))
            let csvContent = "data:text/csv;charset=utf-8,"+headers.join(",")+"\n"+e.data.map(r => headers.map(h=>(r[h]||"")).join(",")).join("\n")
            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", settings.pid+" links "+moment().format("DDMMYY")+".csv");
            document.body.appendChild(link);
            link.click();
            link.remove()
          })
        }
      }
      $().getModal({
        title:"Create unique links",
        body:codingCont,
        footer:submitBtn
      })
    })
  }
  $.fn.forstaSurveySelector=function(params){
    let settings=$.extend(true,{
      container:this[0],
      onSelected:pid=>{}
    }, params)
    let surveySelector=document.createElement("select")
    surveySelector.classList.add("fde-survey-selector")
    $.ajax("/get-forsta-surveys").done(s=>{
      s.forEach((survey, i) => {
        surveySelector.append(new Option(survey.name,survey.id))
      });
      surveySelector.title="Select a Forsta survey..."
      let modal=$().getModal({
        body:surveySelector,
        title:"Select a survey",
        maxWidth:'300px',
        onLoad:()=>{
          $(surveySelector).selectpicker({
            liveSearch:true,
            width:"100%"
          })
          // container.dispatchEvent(new Event("survey-selector-shown"))
        },
      })
      $(surveySelector).change(function(e){
        modal.modal("hide")
        settings.onSelected($(surveySelector).val())
      })
    })
  }
}( jQuery ));
  function copyElementTxt(el){
    window.getSelection().removeAllRanges();
    var range = document.createRange();
    range.selectNode($(el)[0]);
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    window.FlashMessage.success('Copied to clipboard');
  }
  window['moment-range'].extendMoment(moment);
  const chartColours=[
    '#630727',
    '#e8cfd8',
    '#436e4d',
    '#98d1a6',
    '#978243',
    '#d8be73',
    '#630727a8',
    '#e8cfd8a8',
    '#436e4da8',
    '#98d1a6a8',
    '#978243a8',
    '#d8be73a8',
  ]
  const chartTargetBGs=['rgb(175 12 12 / 10%)','rgb(188 141 0 / 10%)','rgb(0 104 24 / 10%)']
  const chartTargetColours=['var(--danger)','var(--warning)','var(--success)']
  Chart.defaults.global.plugins.colorschemes.scheme=chartColours
  Chart.defaults.global.plugins.colorschemes.fillAlpha=0.8
  $body = $("body");
  $("body").addClass("loading")
  window.blockAjaxLoader=false
  let globalSocket=io()
  globalSocket.on("connect",function(e){
    $.ajaxSetup({
      headers: { "socket-id": globalSocket.id }
    });
    globalSocket.emitUpdate=(msg)=>{
      $("#mainLoaderInfo").html(msg+"...")
    }
    globalSocket.on('progress-update',msg=>{
      $("#mainLoaderInfo").html(msg+"...")
    })
  })
  $(document).on({
    ajaxStart: function() {
      if (!window.blockAjaxLoader) {
        $("body").addClass("loading");
      }
    },
    ajaxStop: function() {
      $("#mainLoaderInfo").html("")
      if (!window.blockAjaxLoader) {
        $("body").removeClass("loading");
      }
    }
  });
  window.addEventListener("beforeunload", function (event) {
    $("body").addClass("loading");
    function checkServer(){
      return new Promise((res,rej)=>{
        function loop(){
          console.log("checkingServer")
          $.ajax({
            url:'/server-info',
            global:false,
            success:(e)=>{
              if ($("body").hasClass("loading")) {
                setTimeout(loop,1000)
              }
            },error:(e)=>{
              window.FlashMessage.error('Cannot load the page. The system administrator has been informed by email.',{timeout:1000000})
              res('Cannot load the page. The system administrator has been informed by email.')
            }
          })
        }
        loop()
      })
    }
    return checkServer().then(e=>{
      $("body").removeClass("loading");
      return e
    })
  });
  window.addEventListener("unload", function (event) {
    $("body").removeClass("loading")
  })
  $(document).on('focus', '#navSearch', function(evt) {
    $.ajax({
      url: '/get-search',
      type: 'GET',
      global:false,
      contentType: 'application/json',
      success: function (response) {
        var data=response.map(el=>{
          let obj={}
          obj.icon=['Agent','FaceAgent'].includes(el.dataType)?'<i class="fas fa-user-alt"></i>':'<i class="fas fa-chart-line"></i>'
          obj.label=el.label
          obj.value=el.label
          obj.dataType=el.dataType
          obj.dataid=el.id
          return obj
        })
        $("#navSearch").autocomplete({
          source: data,
          autoFocus: true,
          classes: {
            "ui-autocomplete": "navSearch"
          },
          select: function (event, ui) {
            if (ui.item.dataType=="Agent") {
              window.location.href="/int-performance/0/0/"+ui.item.dataid+"/0"
            }else if (ui.item.dataType=="FaceAgent") {
              window.location.href="/add-f2f-agent/"+ui.item.dataid
            }else {
              window.location.href="/overview/"+ui.item.dataid
            }
            return ui.item.label;
          }
        }).data("ui-autocomplete")._renderItem = function (ul, item) {
          var inner_html = '<div class="searchItem">'+item.icon+" "+item.label+"</div>"
          return $("<li>")
          .data("ui-autocomplete-item", item)
          .attr("data-id", item.label)
          .append(inner_html)
          .appendTo(ul);
        };;
      },
      error: function (jqXHR, exception) {
        prevent=true
        $('#loginModal').modal('show')
        return false
      }
    })
  })
  var intervalCheck = setInterval(checkSignedIn, 5000);
  var startTime=new Date().getTime()
  var checkingSignIn=false
  var firstSignInCheck=true
  let originalDocTitle=document.title
  const updateDocTitle=(newTitle)=>{
    originalDocTitle=newTitle
    $(".page-title").eq(0).html(newTitle)
    document.title=newTitle
  }
  function checkSignedIn(){
    if (!checkingSignIn) {
      checkingSignIn=true
      $.ajax({
        url: '/ajax-auth',
        type: 'GET',
        async:true,
        global:false,
        contentType: 'application/json',
        success: function (response) {
          $('#notifRespData').attr("value",JSON.stringify(response))
          let notifCount=response.queries.newQueriesCount+response.bookings.length+response.onlineAllocations
          if (notifCount>0) {
            $('.avatarNotifications').css("visibility","visible")
            if (Number($('.avatarNotifications').html())<notifCount && !firstSignInCheck) {
              $('.avatarNotifications').removeClass("new")
              $('.avatarNotifications').addClass("new")
            }
            $('.avatarNotifications').html(notifCount)
            document.title="("+notifCount+") "+originalDocTitle
          }else {
            $('.avatarNotifications').css("visibility","hidden")
            document.title=originalDocTitle
          }
          checkingSignIn=false
          firstSignInCheck=false
          return false
        },
        error: function (jqXHR, exception) {
          prevent=true
          $('#loginModal').modal('show')
          return false
        }
      })
      var time=new Date().getTime()
      if (time>startTime+90000000) {
        clearInterval(intervalCheck)
      }
    }
  }
  checkSignedIn()
  function logBackIn(){
    var data =[]
    var jsonData={};
    jsonData.uName=$('#uName').val()
    jsonData.pWord=$('#pWord').val()
    data.push(jsonData)
    $.ajax({
      url: '/ajax-login',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      async:true,
      beforeSend: function () {
        $('#login_btn').removeClass("btn-primary")
        $('#login_btn').addClass("btn-secondary")
        $('#login_btn').addClass("disabled")
        $('#login_btn').html(" ")
      },
      complete: function () {
        $('#login_btn').addClass("btn-primary")
        $('#login_btn').removeClass("btn-secondary")
        $('#login_btn').removeClass("disabled")
        $('#login_btn').html("Go")
      },
      success: function (response) {
        $('#loginError').css("visibility","hidden")
        $('#loginModal').modal('hide')
      },
      error: function (jqXHR, exception) {
        $('#loginError').css("visibility","visible")
        if (jqXHR.status == 401) {
          $('#loginError').text("Incorrect username/password")
        }else {
          $('#loginError').text("Connection to the server has been interrupted. Try refreshing the page. If you have unsaved work on this page, leave this tab open and contact the system administrator")
        }
      },
    });
  }
  function getErrorMessage(jqXHR, exception) {
    var msg = '';
    if (jqXHR.status === 0) {
      msg = 'Not connect.\n Verify Network.';
    } else if (jqXHR.status == 404) {
      msg = 'Requested page not found. [404]';
    } else if (jqXHR.status == 500) {
      msg = 'Internal Server Error [500]. '+JSON.parse(jqXHR.responseText).error;
    } else if (exception === 'parsererror') {
      msg = 'Requested JSON parse failed.';
    } else if (exception === 'timeout') {
      msg = 'Time out error.';
    } else if (exception === 'abort') {
      msg = 'Ajax request aborted.';
    } else {
      msg = 'Uncaught Error.\n' + jqXHR.responseText;
    }
    return msg;
  }
  if (Tabulator.prototype.defaultOptions) {
    Tabulator.prototype.defaultOptions.tableBuilt=function(e){
      let table=this.element
      // console.log("tableBuilt return",table)
      let loadingListener = new MutationObserver((mutationList, observer)=>{
        mutationList.forEach((mutation) => {
          if ($(mutation.addedNodes[0]).hasClass('tabulator-loader')) {
            $(table).find('.tabulator-loader').loader()
          }
        })
      })
      loadingListener.observe(table,{childList:true})
    }
  }else {
    Tabulator.defaultOptions.tableBuilt=function(e){
      let table=this.element
      // console.log("tableBuilt return",table)
      let loadingListener = new MutationObserver((mutationList, observer)=>{
        mutationList.forEach((mutation) => {
          if ($(mutation.addedNodes[0]).hasClass('tabulator-loader')) {
            $(table).find('.tabulator-loader').loader()
          }
        })
      })
      loadingListener.observe(table,{childList:true})
    }
  }
  $(document).ready(function () {
    originalDocTitle=document.title
    if ($('#messageBar')) {
      $('#messageBar').addClass('msgShow')
    }
    function closeMessage(){
      $('#messageBar').hide()
    }
    checkSignedIn()
    $('.infoHover').each(function(i) {
      $(this).tooltip({
        html:true,
        placement:'right',
        title:$(this).html()
      })
      $(this).html(' <i class="fas fa-info-circle"></i>')
    });
    $('#dropdownUser').on('shown.bs.dropdown',function(e){
      $('#menuNotifications').html('<img src="/spinner.gif" id="notifLoadSpinner" height="38px" style="margin:auto">')
      let bookingsJSON=$('#notifRespData').attr('value')
      let bookings=bookingsJSON?JSON.parse(bookingsJSON).bookings:[]
      $.ajax({
        url: '/get-notifications',
        type: 'POST',
        data:JSON.stringify({bookings:bookings}),
        contentType: 'application/json',
        global:false,
        success: function(resp){
          $('#menuNotifications').html('')
          let notifCount=resp.queries.length+bookings.length+resp.onlineAllocations.length
          if (notifCount>0) {
            resp.queries.forEach((row, i) => {
              let html=''
              let avs=resp.raisedByAvs.filter(el=>el.projectID).filter(el=>el.projectID==row.projectID)
              html=html+'<a href="/project-queries/'+row.projectID+'" class="notificationQuery dropdown-item">'+
              '<div class="notificationAvCont" style="width:'+(15+(avs.length*20))+'px">'+avs.map((el,i)=>'<img style="left:'+(i*20)+'px" class="notificationAvatars" src="'+el.avatar+'">').join("")+'</div>'+
              '<div class="notificationCount">'+row.queryCount+'</div> Queries on '+row.quoteNo+' '+row.quoteName+'</a>'
              $('#menuNotifications').append(html)
            });
            if (bookings.length>0) {
              let html=''
              let avs=resp.raisedByAvs.filter(el=>el.agentID).filter(el=>bookings.map(a=>Number(a.agentID)).includes(el.agentID))
              html=html+'<a href="/booking-requests/'+bookings[0].teamID+'/0" class="notificationQuery dropdown-item">'+
              '<div class="notificationAvCont" style="width:'+(15+(avs.length*20))+'px">'+avs.map((el,i)=>'<img style="left:'+(i*20)+'px" class="notificationAvatars" src="'+el.avatar+'">').join("")+'</div>'+
              '<div class="notificationCount">'+bookings.length+'</div> Shift booking requests</a>'
              $('#menuNotifications').append(html)
            }
            resp.onlineAllocations.forEach((row, i) => {
              let html=''
              html=html+'<a href="/online-tracker/'+row.jobID+'" class="notificationQuery dropdown-item">'+
              '<div class="notificationAvCont" style="width:15px"></div>'+
              "Add yesterday's completes for <div class='notificationCount'>"+row.neededCount+"</div> panels on "+row.quoteName+'</a>'
              $('#menuNotifications').append(html)
            });
          }else {
            $('#menuNotifications').html('<div class="notificationQuery" style="padding:10px;color:#989898;">No notifications to show</div>')
          }
        }
      });
    })
    $('.guideHover').each(function(i) {
      $(this).tooltip({
        html:false,
        placement:'top',
        title:"Click to view user guide"
      })
      $(this).html('<span class="material-icons-outlined">help_outline</span>')
    });
    buildMenu([
      {txt:'Home',icon:'fas fa-home',onclick:'window.location.href="/home"'},
      {txt:'Projects',icon:'fas fa-project-diagram',items:[
        {url:'/add',txt:'Add Quote',icon:'fas fa-file-signature'},
        {url:'/live-proj',txt:'Live Projects',icon:'fas fa-list-alt'},
        {url:'/proj-page/0',txt:'All Projects',icon:'far fa-list-alt'},
        {url:'/view-planner-new',txt:'Resource Planner',icon:'fas fa-chalkboard-teacher'},
        {url:'/completes-database/',txt:'Completes Database',icon:'fas fa-award'},
        {url:'/unused-sample/',txt:'Unused Sample',icon:'far fa-address-card'},
      ]},{txt:'Admin',icon:'fas fa-edit',items:[
        {url:'/view-clients/',txt:'View Clients',icon:'fas fa-handshake'},
        {url:'/add-panel/',txt:'Add Panel',icon:'far fa-address-card'},
        {url:'/add-interviewers/0',txt:'Add Interviewer',icon:'fas fa-user-plus'},
        {url:'/view-interviewers/1',txt:'View Interviewers',icon:'fas fa-user-alt'},
        {url:'/view-suppliers',txt:'View Suppliers',icon:'fas fa-truck'},
        {url:'/team-management/',txt:'Interviewer Teams',icon:'fas fa-users-cog'},
        {url:'/dedicated-teams/0',txt:'Dedicated Teams',icon:'fas fa-users,fas fa-lock'},
        {url:'/edit_payrates',txt:'Update Pay Rates',icon:'fas fa-pound-sign'},
        {url:'/view-staff/',txt:'View Staff',icon:'fas fa-user-tie'},
        {url:'/admin-panel/',txt:'Admin tools',icon:'fas fa-tools'},
        {url:'/view-f2f-agents/',txt:'F2F Staff',icon:'fas fa-street-view'},
        {url:'/f2f-tablet-admin/',txt:'F2F Tablets',icon:'fas fa-tablet-alt'},
        {url:'/inbound-lines/',txt:'Inbound Lines',icon:'fas fa-phone'},
        {url:'/complaints-log/',txt:'Complaints Log',icon:'far fa-thumbs-down'},
        {url:'/booking-hub/0/0/0',txt:'Booking Hub',icon:'fas fa-book'},
        {url:'/attendance-hub/0/0',txt:'Attendance Hub',icon:'fas fa-briefcase-medical'},
      ]},{txt:'Daily Input',icon:'far fa-keyboard',items:[
        {url:'/tally-sheet/0/0/0/1/1',txt:'Tally Sheet',icon:'fas fa-calendar-alt'},
        {url:'/add-coaching/0/0',txt:'Interviewer Coaching',icon:'fas fa-graduation-cap'},
        {url:'/staff-booking/d/0/ejs/1',txt:'Staff Booking',icon:'fas fa-book'},
        {url:'/quality-control/0/0',txt:'Quality Control',icon:'fas far fa-check-square'},
        {url:'/dial-report/0',txt:'Interviewer Dials',icon:'fas fa-tty'},
      ]},{txt:'Reports',icon:'fas fa-chart-area',items:[
        {url:'/daily-update/0',txt:'View day/eve update',icon:'fas fa-calendar-day'},
        {url:'/live-report/0/de',txt:'View live report',icon:'fas fa-headset heartbeat'},
        {url:'/interviewer-league-table/',txt:'Interviewer League',icon:'fas fa-sort-amount-up'},
        {url:'/team-report/',txt:'Team Performance',icon:'fas fa-users'},
        {url:'/interviewer-snapshot/',txt:'Interviewer Snapshot',icon:'fas fa-th'},
        {url:'/view-interviewer-pay/0/0/0',txt:'Interviewer Wages',icon:'fas fa-coins'},
        {url:'/client-sat/',txt:'Client Satisfaction',icon:'fas fa-comments'},
        {url:'/sales-spend/0/0/0/0/0/0/0',txt:'Call centre figures by date',icon:'fas fa-calendar-week'},
        {url:'/dials-analysis',txt:'Dials Analysis',icon:'fas fa-tty'},
        {url:'/staff-reports/0/0',txt:'Staff Reports',icon:'fas fa-user-tie'},
        {url:'/mi-dashboard/',txt:'MI dashboard',icon:'fas fa-tachometer-alt'},
        {url:'/operations-digest/',txt:'Ops Digest',icon:'fas fa-book-open'},
        {url:'/booking-report/4/7',txt:'Booking Reports',icon:'fas fa-book'},
        {url:'/qc-issues-report/0/0',txt:'QC Advisories',icon:'fas fa-exclamation-circle'},
        {url:'/client-report/',txt:'Client Report',icon:'fas fa-handshake'},
        {url:'/quotes-report/0/0',txt:'Quotes Report',icon:'fas fa-file-signature'},
      ]},
      {txt:"Production",roleIDs:[11,13,6],icon:"fa-solid fa-laptop-code",items:[
        {url:"/data-editor",txt:"Data editor",icon:"fa-solid fa-pen-to-square"},
        {onclick:()=>$().forstaUniqueLinks(),txt:"Create links",icon:"fa-solid fa-link"},
      ]}
    ])
  })
  $(window).on('load', function () {
    $('body').css("visibility","visible")
    $("body").removeClass("loading")
  })
  let getMenuItem=(url,txt,icon,isAdmin)=>`<a href="/`+url+`" title="`+txt+`" class="`+(isAdmin?'adminLocked':'')+`">`+txt+` <i class="`+icon+`"></i></a>`
  let buildMenu=(groups)=>{
    let buildIcon=classes=>{
      let split=classes.split(",")
      return '<div class="iconGroup">'+split.map(i=>`<i class="`+i+`"></i>`).join("")+"</div>"
    }
    groups.forEach((grp, i) => {
      let grpEl=document.createElement("div")
      $(grpEl).addClass('menuGrp').html("<button type='button' class='navBtn' "+(typeof grp.onclick==='string'?`onclick='`+grp.onclick+`'`:"")+"><i class='"+grp.icon+"'></i><span class='menuTxt'>"+grp.txt+"</span></button>")
      if (typeof grp.onclick==='function') {
        $(grpEl).click(grp.onclick)
      }
      if ((grp.roleIDs||[]).length&&!grp.roleIDs.includes(user.roleID)&&user.roleID!=2) {
        grpEl.classList.add("disabled")
      }
      if (grp.items) {
        let itemsEl=document.createElement("div")
        $(itemsEl).addClass('navGroup')
        grp.items.forEach((item, i) => {
          let link=document.createElement("a")
          link.href=(item.url||"#")
          link.title=item.txt
          link.class=item.isAdmin?'adminLocked':''
          link.innerHTML=item.txt+` `+buildIcon(item.icon)
          if (item.onclick) {
            link.onclick=item.onclick
          }
          // console.log(item.roleIDs,user.roleID)
          if ((item.roleIDs||[]).length&&!item.roleIDs.includes(user.roleID)&&user.roleID!=2) {
            link.classList.add("disabled")
          }
          $(itemsEl).append(link)
        });
        $(grpEl).append(itemsEl)
      }
      $('#navMenu').append(grpEl)
    });
    let noteBtn=$(document.createElement("div"))
    noteBtn.addClass("menuGrp makeAnoteGrp")
    noteBtn.html("<button type='button' class='navBtn'><i class='fas fa-pencil-alt'></i><span class='menuTxt'>Make a note</span></button>")
    let noteCont=$(document.createElement("div"))
    noteCont.addClass("makeAnote").addClass('navGroup')
    noteBtn.append(noteCont)
    let noteJob=$(document.createElement("input")).attr("placeholder","Enter the project...")
    let noteInput=$(document.createElement("textarea")).attr("placeholder","Add a note for future reference on the selected project...").addClass("form-control")
    let noteAdd=$(document.createElement("button")).addClass('btn btn-secondary').html('Add note')
    noteCont.append(noteJob).append(noteInput).append(noteAdd)
    noteJob.addClass("form-control").on('keydown',()=>noteJob.attr('data-selectedID','')).autocomplete({
      source:(req,res)=>{
        $.ajax({
          url: '/get-search',
          type: 'GET',
          data:{term:req.term},
          global:false,
          contentType: 'application/json',
          success:resp=>{
            res(resp.filter(r=>r.dataType=='Job').map(r=>({id:r.id,label:r.label})))
          }
        })
      },
      appendTo:noteCont,
      autoFocus:true,
      minLength:3,
      select: function (event, ui) {
        noteJob.attr('data-selectedID',ui.item.id)
        return ui.item.label
      },
    }).data("ui-autocomplete")._renderItem = function (ul, item) {
      var inner_html = '<div class="searchItem">'+item.label+"</div>"
      return $("<li>")
      .data("ui-autocomplete-item", item)
      .attr("data-id", item.id)
      .append(inner_html)
      .appendTo(ul);
    };
    noteBtn.find('.navBtn').click(()=>{
      // if (noteJob.find("option").length==0) {
    //     noteBtn.find('.navBtn').eq(0).loader({container:'#navMenu'})
    //     noteJob.empty()
    //     $.ajax({
    //       url: '/get-filters',
    //       type: 'GET',
    //       global:false,
    //       contentType: 'application/json',
    //       success: function (filterOptions) {
    //         console.log(filterOptions.quotes)
            // noteJob.append(new Option('',''))
            // filterOptions.quotes.forEach((job, i) => {
            //   noteJob.append(new Option(job.txt,job.id))
            // });
            // console.log(noteJob)
            // noteJob.selectpicker({
            //   liveSearch:true,
            //   width:'100%',
            //   container:noteCont,
            //   size:4,
            //   dropupAuto:false
            // })
            // noteJob.on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
            //   noteBtn.trigger('hover')
            // });
            noteCont.addClass('active')
            noteInput.css("height","200px")
    //         noteBtn.find('.navBtn').eq(0).loader('done')
    //       }
    //     })
    //   }
    })
    noteAdd.click(()=>{
      noteJob.removeClass("invalid")
      noteInput.removeClass("invalid")
      if (!noteJob.attr('data-selectedID')) {
        noteJob.addClass("invalid")
      }
      if (!noteInput.val()) {
        noteInput.addClass("invalid")
      }
      if (noteJob.attr('data-selectedID') && noteInput.val()) {
        $.ajax({
          url: '/update-note',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify([{page:'makeAnote',agentID:user.staffID,date:moment().format("YYYY-MM-DD"),otherID:Math.round((Date.now()-new Date('2022-01-01').valueOf())/1000),jobID:noteJob.attr('data-selectedID'),note:noteInput.val()}]),
          success: function (response) {
            window.FlashMessage.success('Note saved!')
            // noteCont.removeClass('active')
            noteInput.val('')
          },
          error: function (jqXHR, exception) {
            alert(getErrorMessage(jqXHR, exception))
          },
        });
      }
    })
    $('.jNav').append(noteBtn)
  }
  function getCsatScores(dateParams){
    return new Promise((resolve,reject)=>{
      askiaVista.config({
        url: "https://survey.teamsearchsurvey.co.uk/AskiaVistaReader.Net4/AjaxEmbedHandler.aspx",
        authenticityToken: "9a2bf464-c055-4743-810c-716672cead5c",
        global:false,
      });
      askiaVista.login({
        login : 'joe.black',
        password : 'TSYngzYMc',
        success : function () {
          console.log('The user was successfully authenticated');
          askiaVista.getInterviews({
            "format": "json",
            "lazyLoading": false,
            maxPerPage: 999999,
            "settings": {
              "id": 1
            },
            subPopulation : {
              name : "Responded",
              script : "s5 has {1 to 11}" // AskiaScript goes here
            },
            "questions": [
            {
              "key": "444|3@@0",
              "shortcut": "BrokerPanelId"
            },
            {
              "key": "444|233@@0",
              "shortcut": "s5"
            },
            {
              "key": "444|271@1877;@0",
              "shortcut": "s5_1 (Scripting/programming of the questionnaire)"
            },
            {
              "key": "444|271@1878;@0",
              "shortcut": "s5_1 (Data/tables/other deliverables)"
            },
            {
              "key": "444|271@1879;@0",
              "shortcut": "s5_1 (Management of timelines, quotas &amp; resource)"
            },
            {
              "key": "444|271@1880;@0",
              "shortcut": "s5_1 (Overall communications)"
            },
            {
              "key": "444|245@@0",
              "shortcut": "s3"
            },
            {
              "key": "444|218@@0",
              "shortcut": "s4"
            },
            {
              "shortcut": "s1a"
            },
            {
              "shortcut": "s1b"
            },
            {
              "shortcut": "s1c"
            },
            {
              "shortcut": "s2"
            },
            {
              "shortcut": "cName"
            },
            {
              "shortcut": "cEmail"
            },
            {
              "shortcut": "start_time"
            },
            {
              "shortcut": "end_time"
            }
            ],
            "survey": {
              "id": 444,
              "name": "0000_Client_Satisfaction_Survey"
            },
            global:false,
            success:function(d,query){
              var data=JSON.parse(d)
              // console.log("Got data from Vista",data)
              // console.log('Finding in raw Vista data:',data.interviews.filter(el=>el[0].responses[0]=='a7PEt3W'))
              // console.log('Finding email in raw Vista data:',data.interviews.filter(el=>el[13].responses[0]=='jo.cliff@platypusresearch.com'))
              var csatScores=data.interviews.filter(el=>el[1].responses[0].entryCode>0)
              var csatIDs=csatScores.map(el=>el[0].responses[0])
              $.ajax({
                url: '/all-projects-raw',
                type: 'POST',
                global:false,
                contentType: 'application/json',
                data: JSON.stringify({stDate:dateParams.stDate,enDate:dateParams.enDate}),
                success: function (response) {
                  // console.log('Finding in projects:',response.find(el=>el.quoteID==14219))
                  // console.log('Finding in Vista data:',csatScores.find(el=>el[0].responses[0]=='a7PEt3W'))
                  var projects=response.filter(el=>csatIDs.includes(el.csatID)).map(el=>{
                    var vistaData=csatScores.find(el2=>el2[0].responses[0]==el.csatID)
                    // if (el.quoteID==14219) {
                    //   console.log('Iterating:',el,vistaData)
                    // }
                    el.BrokerPanelId=vistaData[0].responses[0]
                    el.s5=Number(vistaData[1].responses[0].entryCode)
                    el.s5_1=Number(vistaData[2].responses[0].entryCode)
                    el.s5_2=Number(vistaData[3].responses[0].entryCode)
                    el.s5_3=Number(vistaData[4].responses[0].entryCode)
                    el.s5_4=Number(vistaData[5].responses[0].entryCode)
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
                    el.s3=vistaData[6].responses[0]
                    el.s4=vistaData[7].responses[0]
                    el.s1a=vistaData[8].responses[0].entryCode
                    el.s1b=vistaData[9].responses[0].entryCode
                    el.s1c=vistaData[10].responses[0].entryCode
                    el.s2=vistaData[11].responses[0].entryCode
                    el.cName=vistaData[12].responses[0]
                    el.cEmail=vistaData[13].responses[0]
                    el.start_time=vistaData[14].responses[0]
                    el.cmName=el.staffName[0]
                    el.pmName=el.staffName[1]
                    el.respDate=vistaData[15].responses[0]?moment(vistaData[15].responses[0],'DD/MM/YYYY HH:mm:ss',true).format():vistaData[14].responses[0]
                    //el.s5 = original overall score
                    //el.s5calc = mean of individual scores if any given. If not, takes the original overall score
                    //el.s5cm = mean of CM scores if given. If not, takes original overall score
                    //el.s5pm = mean of PM scores if given. If not, and if the CM has no scores either, takes original overall score. If CM has scores, takes NaN
                    return el
                  })
                  resolve(projects)
                },
                error: function (jqXHR, exception) {
                  resolve([])
                },
              });
            }
          })
        },
        error:function (message, query) {
          console.log(message);
          reject(message)
        }
      })
    })
  }
  function getCsatScoresF(dateParams){
    return $.ajax({
      url: '/get-csat-scores',
      global:false,
      contentType: 'application/json',
      data: {stDate:dateParams.stDate,enDate:dateParams.enDate}
    })
  }

  function getVistaPortfolio(surveyName,portfolioName,itemName,questions,filter){
    function getPortfolio(){
      return new Promise((resolve,reject)=>{
        let returnData=[]
        let p=0
        function loopPages(){
          askiaVista.getPortfolioItem({
            portfolio:portfolioName,
            portfolioItem:itemName,
            survey:surveyName,
            page:p,
            maxPerPage:99999,
            verbose:true,
            success : function (data, query) {
              console.log(surveyName,JSON.parse(data),'Page '+p+" of "+(JSON.parse(data).results.totalPages-1))
              returnData=returnData.concat(JSON.parse(data).results.interviews)
              if (JSON.parse(data).results.totalPages && (JSON.parse(data).results.totalPages-1)>p) {
                p++
                loopPages()
              }else {
                // console.log(surveyName,"Resolved",returnData)
                resolve(returnData)
              }
            },
            error : function (message, query) {
              // console.log(surveyName,"Error in retrieve: "+message)
              resolve(returnData)
            }
          })
        }
        loopPages()
      })
    }
    function createPortfolioItem(isNew){
      return new Promise((resolve,reject)=>{
        let portfolio=(isNew?{id:0,name:portfolioName}:portfolioName)
        askiaVista.savePortfolioItem({
          survey  : surveyName,
          id      : 0,
          portfolio : portfolio,
          type    : 'rawData',
          name : itemName,
          definition : {
            title: "??R??",
            questions : questions,
            subPopulation : {
              script : filter,
            },
          },
          success : function (data, query) {
            // console.log("built item",surveyName,portfolioName)
            resolve(data)
          },
          error : function (message, query) {
            // console.log(surveyName,"Error in create: "+message)
            alert("Error creating report for "+surveyName+". Vista says: "+message);
            resolve([])
          }
        })
      })
    }
    return new Promise((resolve,reject)=>{
      askiaVista.config({
        url: "https://survey.teamsearchsurvey.co.uk/AskiaVistaReader.Net4/AjaxEmbedHandler.aspx",
        authenticityToken: "9a2bf464-c055-4743-810c-716672cead5c",
        global:false,
      });
      askiaVista.login({
        login : 'joe.black',
        password : 'TSYngzYMc',
        success : function () {
          // console.log('The user was successfully authenticated');
          askiaVista.getPortfolioItems({
            portfolio:portfolioName,
            survey:surveyName,
            success : function (data, query) {
              console.log("found item",surveyName,portfolioName)
              if (itemName!=portfolioName) {
                if (JSON.parse(data).find(el=>el.name==itemName)) {
                  getPortfolio().then(data=>{
                    resolve(data)
                  })
                }else {
                  createPortfolioItem().then(data=>{
                    getPortfolio().then(data=>{
                      resolve(data)
                    })
                  })
                }
              }else {
                getPortfolio().then(data=>{
                  resolve(data)
                })
              }
            },
            error : function (message, query) {
              console.log("couldn't find item, building instead",surveyName,portfolioName)
              createPortfolioItem(true).then(data=>{
                getPortfolio().then(data=>{
                  resolve(data)
                })
              })
            }
          })
        },
        error : function (message, query) {
          alert("Error in login: "+message);
          resolve([])
        }
      })
    })
  }
  const getLoadingDots=(params)=>{
    params=params || {}
    let el=document.createElement("span")
    $(el).addClass("loading-dots")
    if (params.css) {
      $(el).css(params.css)
    }
    let dot=document.createElement("span")
    dot.innerHTML='<i class="fa-solid fa-circle"></i>'
    $(dot).addClass("dot")
    el.append(dot.cloneNode(true))
    el.append(dot.cloneNode(true))
    el.append(dot.cloneNode(true))
    return el
  }
