window.onresize = function(){
  Tabulator.prototype.findTable('div').forEach((table, i) => {
    table.redraw()
  });
}
const dateIf = (inDate, seperator, order) => {
  let day =''
  if (new Date(inDate).getDate() < 10) {
    day = '0' + new Date(inDate).getDate()
  } else {
    day = new Date(inDate).getDate()
  }
  let month =''
  if (new Date(inDate).getMonth()+1 < 10) {
    month = '0' + (new Date(inDate).getMonth()+1)
  } else {
    month = (new Date(inDate).getMonth()+1)
  }
  let year = new Date(inDate).getFullYear()
  if(order=="f"){
  return(day+seperator+month+seperator+year)
  }
  if(order=="r"){
  return(year+seperator+month+seperator+day)
  }
}
var isTrackerSpend=function(cell){
  return cell.getData().allocationID?false:true
}
var trackerSpendClick=function(e,cell){
  if (cell.getData().allocationID) {
    $(cell.getElement()).tooltip({
      title:'Can only be changed using the online tracker',
      trigger:'manual'
    }).tooltip('show')
    setTimeout(()=>{
      $(cell.getElement()).tooltip('hide')
    },1000)
  }
}
var isUserAuthor=function(cell){
  return cell.getData().raisedByID==thisUser.staffID || cell.getData().raisedByID==1
}
var downloadYN = function(value, data, type, params, column){
    return value?'Y':'N';
}
var downloadStaffID = function(value, data, type, params, column){
    return value>1?staffInitials[value]:'Client';
}
var downloadDate = function(value, data, type, params, column){
    return moment.utc(value).format("DD/MMM HH:mm");
}
var sortStaff=function(a, b, aRow, bRow, column, dir, sorterParams){
  var strA=staffInitials[a]?staffInitials[a]:' '
  var strB=staffInitials[b]?staffInitials[b]:' '
  return strA.localeCompare(strB)
}
function cleanString(input) {
  var output = "";
  for (var i=0; i<input.length; i++) {
    if (input.charCodeAt(i) <= 127 && input.charCodeAt(i)>31) {
      output += input.charAt(i);
    }else if(input.charCodeAt(i)==8216 || input.charCodeAt(i)==8217) {
      output +="'"
    }else if(input.charCodeAt(i)==8211) {
      output +="-"
    }
  }
  return output;
}
var queryEditor = function(cell, onRendered, success, cancel, editorParams){
    var editor = document.createElement("textarea");
    editor.style.width = "100%";
    editor.style.height = "100%";
    editor.value = cell.getValue()?cell.getValue():''
    let oldValue=cell.getValue()?cell.getValue():''
    onRendered(function(){
      editor.focus();
    });
    var addOne=false
    var sourceRow=cell.getRow()
    var queriesTable=cell.getTable()
    function successFunc(){
      // queriesTable.redraw()
      if (addOne) {
        var obj={}
        Object.assign(obj, blankQueryRow)
        queriesTable.addRow(obj, false, sourceRow).then(function(row){
          row.update({jobID:sourceRow.getData().jobID,raisedForID:sourceRow.getData().raisedForID,queryCat:sourceRow.getData().queryCat,queryPos:sourceRow.getData().queryPos+1})
          console.log(cell)
          queriesTable.modules.history.action("cellEdit", cell._cell, { oldValue: oldValue, newValue: editor.value });
          console.log(queriesTable.modules.history.history)
          success(editor.value);
          sourceRow.reformat()
          function openEdit(){
            row.getCell('query').edit()
          }
          setTimeout(openEdit, 100);
        })
      }else if(!editor.value && sourceRow.getNextRow()) {
        updateJob('delete','ProjectQueries',[],[],'queryID',sourceRow.getData().queryID).then(function(e){
          sourceRow.delete()
        }).catch(err=>{
          console.log(err)
          sourceRow.delete()
        })
      }else {
        // console.log(cell,cell.getElement())
        // queriesTable.modules.history.action("cellEdit", cell._cell, { oldValue: oldValue, newValue: editor.value });
        console.log(queriesTable.modules.history.history)
        success(editor.value);
        console.log(queriesTable.modules.history.history)
        // sourceRow.reformat()
      }
    }
    editor.addEventListener("keydown", function(event){
      if (event.keyCode === 13) {
        var queriesTable=cell.getTable()
        var sourceRow=cell.getRow()
        if (!event.ctrlKey && !event.altKey) {
          event.preventDefault();
          if (editor.value!=="") {
            addOne=true
          }
          $(editor).trigger('blur')
        }else {
          var cursorPos = $(editor).prop('selectionStart');
          var textBefore = editor.value.substring(0,  cursorPos);
          var textAfter  = editor.value.substring(cursorPos, editor.value.length);
          editor.value=textBefore + '\r\n' + textAfter
        }
      }
    });
    editor.addEventListener("paste",  function(event){
      event.preventDefault()
      var lines=event.clipboardData.getData('text').split("\n").filter(el=>el.length>1).map(el=>cleanString(el.trim()))
      var currRow=sourceRow
      var i=0
      function addLines(){
        var line=lines[i]
        if (i<lines.length) {
          if (i==0) {
            var cursorPos = $(editor).prop('selectionStart');
            var textBefore = editor.value.substring(0,  cursorPos);
            var textAfter  = editor.value.substring(cursorPos, editor.value.length);
            editor.value=textBefore + line + textAfter
            $(editor).trigger('blur')
            i++
            addLines()
          }else {
            var obj={}
            Object.assign(obj, blankQueryRow)
            cell.getTable().addRow(obj, false, currRow).then(function(row){
              row.update({jobID:sourceRow.getData().jobID,raisedForID:sourceRow.getData().raisedForID,query:line,queryPos:currRow.getData().queryPos+1})
              currRow=row
              queryCellEdited(row.getCell('query')).then(function(e){
                i++
                addLines()
              })
            })
          }
        }
      }
      if (event.clipboardData.items[0].type.indexOf("image") > -1) {
          var blob = event.clipboardData.items[0].getAsFile();
          var mycanvas = document.createElement("canvas");
          var ctx = mycanvas.getContext('2d');
          var img = new Image();
          img.onload = function(){
            mycanvas.width = this.width;
            mycanvas.height = this.height;
            ctx.drawImage(img, 0, 0);
            if (sourceRow.getData().queryID>-1) {
              addImg(mycanvas.toDataURL("image/png"),'Query Images','png').then(function(e){
                addQueryImg(e,sourceRow.getData().queryID,null).then(function(){
                  let imgs=sourceRow.getData().queryImages?sourceRow.getData().queryImages:[]
                  imgs.push(e)
                  sourceRow.update({queryImages:imgs}).then(e=>{
                    sourceRow.getTable().replaceData()
                  })
                })
              })
            }else {
              addImg(mycanvas.toDataURL("image/png"),'Query Images','png').then(function(e){
                if (editor.value!=="") {
                  addOne=true
                }
                editor.value=editor.value+'<<imgsrc>>'+e
                $(editor).trigger('blur')
              })
            }
          };
          var URLObj = window.URL || window.webkitURL;
          img.src = URLObj.createObjectURL(blob);
      }else {
        addLines()
      }
    });
    editor.addEventListener("blur", successFunc);
    //return the editor element
    return editor;
};
function queryFilter(headerValue, rowValue, rowData, filterParams){
    const regex = new RegExp(headerValue,'i')
    var replies=rowData.replyData?rowData.replyData.map(el=>el.reply).join():""
    return regex.test(rowValue+replies)
}
function setPostitionsAfter(row){
  row.getTable().getRows().forEach((row2, i) => {
    if (row2.getPosition(true)>=row.getPosition(true)) {
      row2.update({queryPos:row2.getPosition(true)})
      updateJob('update','ProjectQueries',['queryPos'],[row2.getPosition(true)],'queryID',row2.getData().queryID)
    }
  });
}
var staffSelect=function(value, title){ //prefix all titles with the work "Mr"
  var cmBadge=' <span class="badge badge-cm" style="visibility:">CM</span>'
  var pmBadge=' <span class="badge badge-pm" style="visibility:">PM</span>'
  return title+(value==projectCM?cmBadge:'')+(value==projectPM?pmBadge:'')
}
function queryCellEdited(cell){
  cell.getRow().reformat()
  var table=cell.getTable()
  var thisRow=cell.getRow()
  if (cell.getField()!='query' && thisRow.isSelected()) {
    table.getSelectedRows().forEach((row, i) => {
      var obj={}
      obj[cell.getField()]=cell.getValue()
      row.update(obj)
      updateJob('update','ProjectQueries',[cell.getField()],[cell.getValue()],'queryID',row.getData().queryID)
    });
  }
  table.deselectRow(table.getRows())
  if (cell.getData().queryID==-1) {
    if (cell.getData().query) {
      setPostitionsAfter(thisRow)
      let data=cell.getData()
      let src
      let q
      if (cell.getData().query.split('<<imgsrc>>')[1]) {
        src=cell.getData().query.split('<<imgsrc>>')[1]
        q=cell.getData().query.split('<<imgsrc>>')[0]
        data.query=q
      }
      return addQuery(data).then(function(e){
        if (src) {
          return addQueryImg(src,e.id,null).then(s=>{
            thisRow.update({queryID:e.id,seenDate:moment.utc().format("YYYY-MM-DD HH:mm"),queryImages:[src]})
          })
        }else {
          thisRow.update({queryID:e.id,seenDate:moment.utc().format("YYYY-MM-DD HH:mm")})
        }
      })
    }
  }else if (cell.getData().query) {
    // console.log("Existing row. updated field",cell.getField())
    return updateJob('update','ProjectQueries',[cell.getField()],[cell.getValue()],'queryID',cell.getData().queryID)
  }
  if (!cell.getData().query && table.getData().length>1) {
    if (cell.getData().queryID>-1) {
      // console.log("Query removed. deleted")
      return updateJob('delete','ProjectQueries',[],[],'queryID',cell.getData().queryID).then(function(e){
        thisRow.delete()
      })
    }else {
      // console.log("False start. deleted dry")
      // return thisRow.delete()
    }
  }else if (!cell.getData().query) {
    // console.log("No rows. deleted from db")
    return updateJob('delete','ProjectQueries',[],[],'queryID',cell.getData().queryID)
  }

  return false
}
function rowStyle(id,row){
  row.getCells().forEach((cell, i) => {
    cell.getElement().style.padding= "4px";
    cell.getElement().style.height= "29px";
  })
  if(id == -1){
    row.getElement().style.backgroundColor = "rgb(255 255 255)";
    row.getElement().style.height= "30px";
    row.getElement().style['box-shadow'] = "rgb(102 142 212 / 33%) 0px 0px 20px 8px inset";
    row.getElement().style['color'] = "#253ace";
    row.getElement().style['margin-top']= "10px";
  }else {
    row.getElement().style.backgroundColor = "unset";
    row.getElement().style.height= "30px";
    row.getElement().style['box-shadow'] = "unset";
    row.getElement().style['color'] = "initial";
    row.getElement().style['margin-top']= "initial";
  }
}

var isCATI = function(cell){
  return cell.getData().typeSelect.includes('CATI')
}
var replyIcon=function(cell, formatterParams, onRendered){
  let replies=cell.getData().repliesCount
  let newReplies=cell.getData().newRepliesCount
  let html=""
  if (replies) {
    html=html+(newReplies>0?'<span class="replyCount new">'+newReplies+'</span>':'')
    html=html+'<span class="replyCount">'+replies+'</span>'
  }else {
    html=""
  }
  html=html+'<button type="button" class="btn replyBtn btn-outline-primary"><i class="fas fa-reply"></i></button>'
  return html
}
var urgentBtn=function(cell, formatterParams, onRendered){
  return '<button type="button" class="btn urgentBtn btn-outline-'+(cell.getValue()?'danger':'secondary')+'"><i class="fas fa-exclamation"></i></button>'
}
var queryImgFormat = function(cell, formatterParams, onRendered){
  let html=""
  let start=0
  let items=[]
  if (cell.getValue()) {
    cell.getValue().forEach((src, i) => {
      html=html+'<img src="'+src+'" style="left:'+(start+(i*4))+'%" class="queryImg">'
      items.push({
        src:src
      })
    });
    $(cell.getElement()).magnificPopup({
      items: items,
      gallery: {
        enabled: true
      },
      callbacks: {
        elementParse: function(item) {
        }
      },
      type: 'image',
      image: {
        markup: '<div class="mfp-figure">'+
                  '<div class="mfp-close"></div>'+
                  '<div class="mfp-img"></div>'+
                  '<div class="mfp-bottom-bar">'+
                    '<div class="mfp-title"></div>'+
                  '</div>'+
                '</div>'
      }
    })
    $(cell.getElement()).on('mfpOpen', function(e /*, params */) {
      $('.mfp-content').after('<button type="button" class="btn btn-outline-danger mfp-delete"><i class="far fa-trash-alt"></i></button>')
      $('.mfp-delete').on('mousedown',function(e){
        deleteQueryImg($(this).prev().find('img').attr("src"),cell.getData().queryID,null).then(e=>{
          cell.getRow().getTable().replaceData()
          $('.mfp-close').click()
        })
        // let imgs=cell.getData().queryImages
        // imgs.push(e)
        // sourceRow.update({queryImages:imgs})
      })
    });
  }
  return html
}
var xIcon = function(cell, formatterParams, onRendered){ //plain text value
  return "x";
};
var costNameEditCheck = function(cell){
  return cell.getData().sqlCol=="" || cell.getData().costID==-1
}
var costTypeEditCheck = function(cell){
  return cell.getData().sqlCol=="" || cell.getData().costID==-1
}
var costNoteEditCheck = function(cell){
  return cell.getData().costID!=-1
}
var costAddRemIcon = function(cell, formatterParams, onRendered){ //plain text value
  var ret=''
  if (cell.getData().costID==-1) {
    ret='<button type="button" id="add-cost-row" class="btn addBtn btn-outline-primary"><i class="fas fa-plus"></i></button>'
  }else if (cell.getData().sqlCol=="") {
    ret='<button type="button" width="20px" id="rem-date-'+cell.getData().costID+'" class="btn rem-date-row remBtn btn-outline-danger"><i class="fas fa-minus"></i></button>'
  }
  return ret
};
var urgentClick=function(e, cell){
  if (cell.getValue()) {
    cell.setValue(0)
  }else {
    if (!cell.getData().query) {
      alert("You must enter a query first")
    }else if (!cell.getData().raisedForID) {
      alert("You must select someone to direct your query to first")
    }else {
      cell.setValue(1)
      $('#Modal-title').html('Urgent query!')
      $('#modal-body').addClass("text-center").html("Alert "+staffInitials[cell.getData().raisedForID]+' via email now?')
      $('.modal-footer').html('<button type="button" class="btn sendBtn btn-primary">Yes</button><button type="button" class="btn closeBtn btn-secondary">No</button>')
      $('.modal-footer').css("justify-content","center")
      $('#Modal').modal("show")
      $('.sendBtn').on('click', function(evt) {
        sendEmail('URGENT: Query on '+projectName,'From: '+staffInitials[cell.getData().raisedForID]+'<br><h5>'+cell.getData().query+"<br></h5><a href='http://job-analysis:8080/project-queries/"+cell.getData().projectID+"'>Reply</a>",cell.getData().raisedForID,"high")
        $('.sendBtn, .closeBtn').off()
        $('#Modal').modal("hide")
        $('#modal-body').removeClass("text-center")
      })
      $('.closeBtn').on('click', function(evt) {
        $('.sendBtn, .closeBtn').off()
        $('#Modal').modal("hide")
        $('#modal-body').removeClass("text-center")
      })
    }
  }
}
var queryReplyClick=function(e, cell){
  let table=cell.getTable()
  let selected=table.getSelectedData()
  if (selected.length>0) {
    let html=""
    +"<table class='replyTable'>"
    selected.forEach((query, i) => {
      html=html+"<tr class='originalQuery'><td style='width:20%'>"+staffInitials[query.raisedByID]+"</td><td style='width:10%'>"+moment(query.raisedDate).format("DD/MMM HH:mm")+"</td><td>"+query.query+"</td><td></td><td></td></tr>"
    });
    html=html+"</table>"
    +"<textarea style='width:100%;margin-bottom: 10px;' class='form-control' id='newReply'></textarea>"
    +"<button id='newReplyBtn' class='btn btn-primary'>Submit reply</button>"
    +""
    $('#Modal-title').html('Reply to all selected queries')
    $('#modal-body').html(html)
    $('#Modal').modal("show")
    $('#Modal').on('shown.bs.modal', function(evt) {
      $('#newReply').focus()
      cell.getTable().replaceData()
    })
    $('#newReplyBtn').on('click', function(evt) {
      let i=0
      function sendReply(){
        if (i<selected.length) {
          let replyData={}
          replyData.queryID=selected[i].queryID
          replyData.reply=$('#newReply').val()
          replyData.replyDate=moment().format("YYYY-MM-DD HH:mm")
          replyData.replyFromID=thisUser.staffID
          $.ajax({
            url: '/add-projectquery-reply/',
            type: 'POST',
            data: JSON.stringify(replyData),
            contentType: 'application/json',
            success: function(response){
              addEventSeen('ProjectQueryReplies',[response.id],[replyData.queryID]).then(function(e){
                i++
                sendReply()
              })
            },
            error: function (jqXHR, exception) {
              alert(getErrorMessage(jqXHR, exception))
            },
          })
        }else {
          cell.getTable().replaceData()
          $('#Modal').modal("hide")
        }
      }
      sendReply()
    })
  }else {
    $.ajax({
      url: '/get-query-replies/'+cell.getData().queryID,
      type: 'GET',
      contentType: 'application/json',
      success: function(response){
        function remBtn(replyID){return'<button type="button" data-replyID="'+replyID+'" class="btn remBtn btn-outline-danger"><i class="fas fa-minus"></i></button>'}
        function approveBtn(replyID,isApproved){return'<button type="button" data-replyID="'+replyID+'" data-approved="'+isApproved+'" class="btn approveBtn btn-outline-'+(isApproved?'success':'secondary')+'"><i class="fas fa-check"></i></button>'}
        let html=""
        +"<table class='replyTable'>"
        +"<tr class='originalQuery'><td style='width:20%'>"+staffInitials[cell.getData().raisedByID]+"</td><td style='width:10%'>"+moment(cell.getData().raisedDate).format("DD/MMM HH:mm")+"</td><td>"+cell.getData().query+"</td><td></td><td></td></tr>"
        response.forEach((reply, i) => {
          html=html+"<tr data-replyID='"+reply.replyID+"' class='"+(cell.getData().raisedByID==thisUser.staffID || (cell.getData().raisedByID==1 && thisUser.staffID==projectCM) ?'replyHover':'')+"'><td style='width:20%'>"+staffInitials[reply.replyFromID]+" "+(!reply.seen?'<span class="badge badge-warning">New</span>':'')+"</td><td style='width:20%'>"+moment(reply.replyDate).format("DD/MMM HH:mm")+"</td><td>"+reply.reply+"</td><td style='width:40px' title='"+(reply.isResolution?'Unmark':'Accept')+" as  resolution'>"+(cell.getData().raisedByID==thisUser.staffID || (cell.getData().raisedByID==1 && thisUser.staffID==projectCM)?approveBtn(reply.replyID,reply.isResolution):'')+"</td><td style='width:40px'>"+(reply.replyFromID==thisUser.staffID || (cell.getData().raisedByID==1 && thisUser.staffID==projectCM)?remBtn(reply.replyID):'')+"</td></tr>"
        });
        html=html+"</table>"
        +"<textarea style='width:100%;margin-bottom: 10px;' class='form-control' id='newReply'></textarea>"
        +"<button id='newReplyBtn' class='btn btn-primary'>Submit reply</button>"
        +""
        $('#Modal-title').html('Reply to query')
        $('#modal-body').html(html)
        $('#Modal').modal("show")
        $('#Modal').on('shown.bs.modal', function(evt) {
          $('#newReply').focus()
          cell.getTable().replaceData()
        })
        $('.remBtn').on('click', function(evt) {
          let replyID=$(this).attr('data-replyID')
          let thisRow=$(this).closest('tr')
          updateJob('delete','ProjectQueryReplies',[],[],'replyID',replyID).then(function(e){
            thisRow.remove()
            cell.getTable().replaceData()
          })
        })

        $('.approveBtn').on('click', function(evt) {
          let replyID=$(this).attr('data-replyID')
          let el=this
          updateJob('update','ProjectQueryReplies',['isResolution'],[''],'queryID',cell.getData().queryID).then(function(e){
            $('.approveBtn').each(function(e){
              if ($(this).attr('data-replyID')==replyID) {
                if ($(this).attr("data-approved")=="null") {
                  var now=moment.utc().format("YYYY-MM-DD HH:mm")
                  var el=this
                  updateJob('update','ProjectQueryReplies',['isResolution'],[now],'replyID',replyID).then(function(e){
                    $(el).removeClass('btn-outline-secondary')
                    $(el).addClass('btn-outline-success')
                    $(el).attr("data-approved",now)
                  })
                }else {
                  $(this).removeClass('btn-outline-success')
                  $(this).addClass('btn-outline-secondary')
                  $(this).attr("data-approved","null")
                }
              }else {
                $(this).removeClass('btn-outline-success')
                $(this).addClass('btn-outline-secondary')
                $(this).attr("data-approved","null")
              }
            })
            cell.getTable().replaceData()
          })
        })
        $('#newReplyBtn').on('click', function(evt) {
          let replyData={}
          replyData.queryID=cell.getData().queryID
          replyData.reply=$('#newReply').val()
          replyData.replyDate=moment().format("YYYY-MM-DD HH:mm")
          replyData.replyFromID=thisUser.staffID
          $.ajax({
            url: '/add-projectquery-reply/',
            type: 'POST',
            data: JSON.stringify(replyData),
            contentType: 'application/json',
            success: function(response){
              addEventSeen('ProjectQueryReplies',[response.id],[replyData.queryID]).then(function(e){
                console.log("added to seen",e)
                cell.getTable().replaceData()
                $('#Modal').modal("hide")
              })
            },
            error: function (jqXHR, exception) {
              alert(getErrorMessage(jqXHR, exception))
            },
          })
        })
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
    });
  }
}
var costAddRemClick = function(e, cell){
  tab=cell.getTable()
  if (cell.getData().sqlCol=="" && cell.getData().costID>-1) {
    if (checkCostDel(cell.getData().costID)) {
      updateJob('delete','ProjectCosts',[],[],'costID',cell.getData().costID)
      updateNote('close-project',cell.getData().costID,'','costsTable',cell.getData().projectID)
      tab.deleteRow(cell.getRow()).then(function(e){
        window.dispatchEvent(new CustomEvent("budgetSpendChanged"))
      })
    }else {
      alert("This CPI is currently being used by one or more target groups, and cannot be deleted. Re-assign the CPIs in your target groups before deleting.")
    }
  }else if (cell.getData().costID==-1) {
    var rowAdder=cell.getRow()
    if (validateRow(rowAdder,['costName','costType','costUnits','costUnitValue'])) {
      tab.addRow({}, true, rowAdder)
      .then(function(row){
        row.update(rowAdder.getData())
        addCost(cell.getData().costName,cell.getData().costUnitValue,cell.getData().costUnits,cell.getData().projectID,cell.getData().costType).then(function(e){
          row.update({costID:e.id}).then(function(e){
            window.dispatchEvent(new CustomEvent("budgetSpendChanged"))
          })
        })
        rowAdder.update({projectID:tab.getRow(1).getData().projectID, costID:-1, sqlCol: '', costName:'', costType:'', costTypeCat:'', costValue:0, costUnits:0, costUnitValue:0,note:''})
        rowAdder.reformat()
      })
    }
  }
}
function validateRow(row,fields){
  var failedCount=0
  var fieldsToCheck=fields
  if (fields.length==0) {
    fieldsToCheck=row.getCells()
    fieldsToCheck.forEach((cell, i) => {
      if (cell.getValue().length==0) {
        cell.getElement().style.backgroundColor='#ff06062b'
        failedCount++
      }else {
        cell.getElement().style.backgroundColor='unset'
      }
    })
  }else {
    fieldsToCheck.forEach((field, i) => {
      row.getCell(field).getElement().style.backgroundColor='unset'
      if (!row.getData()[field]) {
        row.getCell(field).getElement().style.backgroundColor='#ff06062b'
        failedCount++
      }
    });
  }
  return failedCount==0
}
function validateRowIf(row,criteria,fields){
  var failedCount=0
  var fieldsToCheck=fields
  fieldsToCheck.forEach((field, i) => {
    // console.log(field,row.getData(),row.getCells())
    row.getCell(field).getElement().style.backgroundColor='unset'
    for (const [key, value] of Object.entries(criteria)) {
      if (!row.getData()[field] && row.getData()[key].includes(value)) {
        row.getCell(field).getElement().style.backgroundColor='#ffc90059'
        failedCount++
      }
    }
  });
  return failedCount==0
}
var costTypeVals=getCostTypes()

function updatePage(field,value){
  if ($('#'+field).length>0) {
    $('#'+field).attr('value',value)
  }
}
function addCost(costName,unitValue,units,projectID,costTypeID){
  var data =[]
  var jsonData={};
  var vals=[]
  jsonData.costName=costName
  jsonData.unitValue=unitValue
  jsonData.units=units
  jsonData.projectID=projectID
  jsonData.costTypeID=costTypeID
  data.push(jsonData)
  return $.ajax({
    url: '/add-project-cost',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
}
function checkCostDel(costID){
  var free=true
  $.ajax({
      url: '/check-cost-delete/'+costID,
      type: 'GET',
      contentType: 'application/json',
      async:false,
      success: function (response) {
        if (response.length>0) {
          free=false
        }
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return free
}
function updateCost(costID,costName,unitValue,units,projectID,costTypeID){
  var data =[]
  var jsonData={};
  jsonData.costID=costID
  jsonData.costName=costName
  jsonData.unitValue=unitValue
  jsonData.units=units
  jsonData.projectID=projectID
  jsonData.costTypeID=costTypeID
  data.push(jsonData)
  $.ajax({
      url: '/update-project-cost',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}
function updateNote(page,dateID,note,table,jobID){
  console.log(page,dateID,note,table,jobID)
  var data =[]
  var jsonData={};
  var vals=[]
  jsonData.tableName=table
  jsonData.jobID=jobID
  jsonData.otherID=dateID
  jsonData.page=page
  jsonData.note=note
  data.push(jsonData)
  $.ajax({
      url: '/update-note',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}
function getCostTypes(){
  var ret={}
  $.ajax({
    url: '/get-cost-types',
    type: 'GET',
    async: false,
    success: function (response) {
      if (response) {
        response.forEach((item, i) => {
          var key=item.costTypeID.toString()
          var cat=item.costTypeCategory?' ['+item.costTypeCategory+']':''
          var val=item.costTypeName.toString()+cat
          ret[key]=val
        });
      }
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
  return ret
}
function getProjectJobs(projectID){
  var ret={}
  $.ajax({
    url: '/get-project-jobs/'+projectID,
    type: 'GET',
    async: false,
    success: function (response) {
      if (response) {
        response.forEach((item, i) => {
          var key=item.jobID.toString()
          var val=item.jobName.toString()
          ret[key]=val
        });
      }
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
  return ret
}

var dateEditor = function(cell, onRendered, success, cancel, editorParams){
  var editor = document.createElement("input");
  editor.setAttribute("type", "date");
  editor.style.padding = "0px";
  editor.style.width = "100%";
  editor.style.height = "100%";
  editor.style.boxSizing = "border-box";
  editor.value = moment(cell.getValue()).format("YYYY-MM-DD")
  onRendered(function(){
    editor.focus();
    editor.style.css = "100%";
  });
  function successFunc(){
    success(editor.value==''?'':editor.value);
  }
  editor.addEventListener("blur", successFunc);
  return editor;
};
var dateTimeEditor = function(cell, onRendered, success, cancel, editorParams){
  var editor = document.createElement("input");
  editor.setAttribute("pattern","\d{1,2}/\d{1,2}/\d{4}")
  editor.style.padding = "0px";
  editor.style.width = "100%";
  editor.style.height = "100%";
  editor.setAttribute('readonly',true)
  editor.value = moment(cell.getValue()).format("DD/MM/YYYY")
  onRendered(function(){
    $(editor).datepicker({
      dateFormat: "yy-mm-dd",
      onSelect: function(dateText) {
        success(moment(dateText).format("YYYY-MM-DD HH:mm"))
      },
      onClose: function(dateText) {
        success(cell.getValue()?moment(cell.getValue()).format("YYYY-MM-DD HH:mm"):null)
      },
      defaultDate:new Date(moment(cell.getValue()).format())
    })

    $(editor).datepicker('show')
  })
  return editor;
};
var checkFormatter = function(cell, formatterParams, onRendered){
  var typeSelect=cell.getRow().getData().typeSelect
  if (typeSelect) {
    return !cell.getRow().getData().typeSelect.includes("CATI")?'':'<input type="checkbox" class="tableCheck" id="'+cell.getField()+'Check-'+cell.getRow().getData().jobID+'" '+(cell.getValue()?'checked':'')+'>'
  }else {
    return ''
  }
}
var checkRevFormatter = function(cell, formatterParams, onRendered){
  var typeSelect=cell.getRow().getData().typeSelect
  console.log("checkRevFormatter",cell.getValue())
  if (typeSelect) {
    return !cell.getRow().getData().typeSelect.includes("CATI")?'':'<input type="checkbox" class="tableCheck" id="'+cell.getField()+'Check-'+cell.getRow().getData().jobID+'" '+(!cell.getValue() || cell.getValue()==="false"?'checked':'')+'>'
  }else {
    return ''
  }
}
var queryFormatter = function(cell, formatterParams, onRendered){
  if (cell.getData().replyData) {
    if (cell.getData().replyData.length>0) {
      var html="<ul class='replyHoverList'>"
      cell.getData().replyData.forEach((reply, i) => {
        html=html+"<li>"+cell.getData()["reply"+i]+"</li>"
      });
      html=html+"</ul>"
      // $(cell.getElement()).tooltip({html:true,title:html,delay: { "show": 500, "hide": 100 }})
    }
  }
  return (cell.getValue()?cell.getValue()+(cell.getData().seenDate==null?'<span class="query-badge badge badge-warning">New</span>':''):'')
}
var checkClick = function(e, cell){
  var thisCheck=$('#'+cell.getField()+'Check-'+cell.getRow().getData().jobID)
  cell.setValue(thisCheck.prop('checked'))
}
var checkRevClick = function(e, cell){
  var thisCheck=$('#'+cell.getField()+'Check-'+cell.getRow().getData().jobID)
  cell.setValue(!thisCheck.prop('checked'))
}
var dateNameEditCheck = function(cell){
  return cell.getData().dateID>3 || cell.getData().dateID==-1
}
var dateNoteEditCheck = function(cell){
  return cell.getData().dateID!=-1
}
var addRemIcon = function(cell, formatterParams, onRendered){ //plain text value
  var ret=''
  if (cell.getData().dateID==-1) {
    ret='<button type="button" id="add-date-row" class="btn addBtn btn-outline-primary"><i class="fas fa-plus"></i></button>'
  }
  if (cell.getData().dateID>3) {
    ret='<button type="button" id="rem-date-'+cell.getData().dateID+'" class="btn rem-date-row remBtn btn-outline-danger"><i class="fas fa-minus"></i></button>'
  }
  return ret
};
var addRemProjectDateIcon = function(cell, formatterParams, onRendered){ //plain text value
  var ret=''
  if (cell.getData().costID==-1) {
    ret='<button type="button" id="add-cost-row" class="btn addBtn btn-outline-primary"><i class="fas fa-plus"></i></button>'
  }else {
    ret='<button type="button" id="rem-date-'+cell.getData().costID+'" class="btn rem-date-row remBtn btn-outline-danger"><i class="fas fa-minus"></i></button>'
  }
  return ''
};
var naIcon = function(cell, formatterParams, onRendered){ //plain text value
  return cell.getData().dateID==-1?'':'<button type="button" id="date-na-'+cell.getData().dateID+'" class="btn btn-sm add-date-NA naBtn btn-outline-warning">N/A</button>';
};
var tbcIcon = function(cell, formatterParams, onRendered){
  return !cell.getData().startDate?'':'<button type="button" class="btn btn-sm naBtn btn-outline-warning">TBC</button>';
};
var naClick = function(e, cell){
  if (cell.getData().dateID!=-1 && cell.getData().dateID>2) {
    cell.getRow().update({dateValue:''})
    if (cell.getData().dateID==3) {
      updateJob('update','Jobs',[cell.getData().sqlCol],[''],'jobID',cell.getData().jobID)
    }else{
      updateJob('update','JobDates',['dateValue'],[''],'dateID',cell.getData().dateID)
    }
  }
}
var tbcClick = function(e, cell){
  if (cell.getData().dateID!=-1) {
    cell.getRow().update({dateValue:'',startDate:null,endDate:null})
    updateJob('update','ProjectDates',['dateValue','endDate'],[null,null],'dateID',cell.getData().dateID)
  }
}
var addRemClick = function(e, cell){
  tab=cell.getTable()
  if (cell.getData().dateID>3) {
    updateJob('delete','JobDates',[],[],'dateID',cell.getData().dateID)
    updateNote('edit-group-page',cell.getData().dateID,'','datesTable',cell.getData().jobID)
    tab.deleteRow(cell.getRow())
  }else if (cell.getData().dateID==-1) {
    var rowAdder=cell.getRow()
    var dateName=rowAdder.getData().dateName
    var dateValue=rowAdder.getData().dateValue
    rowAdder.getCell('dateName').getElement().style.backgroundColor='unset'
    rowAdder.getCell('dateValue').getElement().style.backgroundColor='unset'
    if (!dateName) {
      rowAdder.getCell('dateName').getElement().style.backgroundColor='#ff06062b'
    }else if (!dateValue) {
      rowAdder.getCell('dateValue').getElement().style.backgroundColor='#ff06062b'
    }else {
      tab.addRow({}, true, rowAdder)
      .then(function(row){
        row.update(rowAdder.getData())
        row.update({dateID:addDate(dateName,dateValue,cell.getData().jobID)})
        rowAdder.update({dateID:-1, jobID:tab.getRow(1).getData().jobID, sqlCol: '',dateName: "", dateValue: "", note: ""})
      })
    }
  }
}
var addRemProjectDateClick = function(e, cell){
  tab=cell.getTable()
  if (cell.getData().dateID>-1) {
    updateJob('delete','ProjectDates',[],[],'dateID',cell.getData().dateID)
    updateNote('edit',cell.getData().dateID,'','projectDatesTable',cell.getData().jobID)
    tab.deleteRow(cell.getRow())
  }else{
    var rowAdder=cell.getRow()
    if (validateRow(rowAdder,['dateName','dateValue'])) {
      tab.addRow({}, true, rowAdder)
      .then(function(row){
        row.update(rowAdder.getData())
        addProjectDate(rowAdder.getData().dateName,rowAdder.getData().dateValue,projectID,rowAdder.getPosition(true)).then(e=>{
          row.update({dateID:e.id})
        })
        rowAdder.update({dateID:-1, projectID:projectID, dateName: "", dateValue: "", note: "", datePos:9999})
      })
    }
  }
}
var addRemProjectGanttClick = function(e, cell){
  tab=cell.getTable()
  if (cell.getData().dateID>-1) {
    updateJob('delete','ProjectDates',[],[],'dateID',cell.getData().dateID)
    updateNote('edit',cell.getData().dateID,'','projectDatesTable',cell.getData().projectID)
    tab.deleteRow(cell.getRow())
  }else{
    var rowAdder=cell.getRow()
    if (validateRow(rowAdder,['dateName','startDate'])) {
      tab.addRow({}, true, rowAdder)
      .then(function(row){
        row.update(rowAdder.getData())
        addProjectDate(rowAdder.getData().dateName,rowAdder.getData().startDate,projectID,rowAdder.getPosition(true),rowAdder.getData().endDate).then(e=>{
          row.update({dateID:e.id})
        })
        rowAdder.update({dateID:-1, projectID:projectID, dateName: "", startDate: "", datePos:9999})
      })
    }
  }
}
function addDate(dateName,dateValue,jobID){
  var data =[]
  var jsonData={};
  var vals=[]
  var returnID
  jsonData.dateName=dateName
  jsonData.dateValue=dateValue
  jsonData.jobID=jobID
  data.push(jsonData)
  $.ajax({
      url: '/add-group-date',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify(data),
      success: function (response) {
        returnID=response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return returnID
}
function addProjectDate(dateName,dateValue,projectID,datePos,endDate){
  var data =[]
  var jsonData={};
  var vals=[]
  var returnID
  jsonData.dateName=dateName
  jsonData.dateValue=dateValue
  jsonData.endDate=endDate
  jsonData.projectID=projectID
  jsonData.datePos=datePos
  data.push(jsonData)
  return $.ajax({
      url: '/add-project-date',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
        return response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}
function checkDate(date,jobID,type){
  var data =[]
  var jsonData={};
  var resp=date
  jsonData.date=date
  jsonData.jobID=jobID
  data.push(jsonData)
  $.ajax({
      url: '/check-group-'+type,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      async: false,
      success: function (response) {
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
        resp=JSON.parse(jqXHR.responseText).date
      },
  });
  return resp
}
function countBusinessDays(sDate, eDate){
  var sDate=moment.utc(sDate).startOf('day')
  var eDate=moment.utc(eDate).startOf('day')
  var count = 0;
  var curDate = sDate
  while (curDate < eDate) {
    var dayOfWeek = curDate.format('e');
    if(!((dayOfWeek == 6) || (dayOfWeek == 0))){
      count++;
    }
    curDate.add(1,'days')
  }
  return count+1;
}
function addBusinessDays(dte, cnt){
  var targetDays=cnt
  var curDate=moment.utc(dte).startOf('day')
  var i=0
  if (cnt>0) {
    while (i < targetDays) {
      curDate.add(1,'days');
      var dayOfWeek = curDate.day();
      if(!((dayOfWeek == 6) || (dayOfWeek == 0))){
        i++;
      }
    }
  }else {
    while (i > targetDays) {
      curDate.subtract(1,'days');
      var dayOfWeek = curDate.day();
      if(!((dayOfWeek == 6) || (dayOfWeek == 0))){
        i--;
      }
    }
  }
  return new Date(curDate.format("YYYY-MM-DD"));
};
var spendNoteEditCheck = function(cell){
  return cell.getData().spendID!=-1
}
var spendAddRemIcon = function(cell, formatterParams, onRendered){ //plain text value
  var ret=''
  if (cell.getData().spendID==-1) {
    ret='<button type="button" id="add-spend-row" class="btn addBtn btn-outline-primary"><i class="fas fa-plus"></i></button>'
  }else {
    ret='<button type="button" width="20px" id="rem-date-'+cell.getData().spendID+'" class="btn rem-date-row remBtn btn-outline-danger"><i class="fas fa-minus"></i></button>'
  }
  return ret
};
var spendAddRemClick = function(e, cell){
  tab=cell.getTable()
  if (cell.getData().spendID>-1) {
    updateJob('delete','ProjectSpends',[],[],'spendID',cell.getData().spendID).then(function(e){
      updateNote('overview',cell.getData().spendID,'','spendTable',cell.getData().projectID)
      tab.deleteRow(cell.getRow()).then(function(e){
        window.dispatchEvent(new CustomEvent("budgetSpendChanged"))
      })
    }).catch(function(e){
      alert("Could not delete spend.")
    })
  }else {
    var rowAdder=cell.getRow()
    if (validateRow(rowAdder,['spendDate','typeID','supplierID','spendUnits','spendUnitValue'])) {
      tab.addRow({}, true, rowAdder)
      .then(function(row){
        row.update(rowAdder.getData())
        addSpend(cell.getData().spendDate,cell.getData().spendUnitValue,cell.getData().spendUnits,cell.getData().projectID,cell.getData().typeID,cell.getData().supplierID,cell.getData().PO,cell.getData().jobID).then(function(e){
          row.update({spendID:e.id}).then(function(e){
            window.dispatchEvent(new CustomEvent("budgetSpendChanged"))
          })
        })
        rowAdder.update({projectID:projectID, spendID:-1, typeID:'',spendDate:'', spendType:'', spendTypeCat:'', spendValue:0, spendUnits:0, spendUnitValue:0,note:'',supplierID:'',PO:''})
        rowAdder.reformat()
      })
    }
  }
  callForRefresh()
}
var jobAddRemIcon = function(cell, formatterParams, onRendered){ //plain text value
  var ret = document.createElement("button");
  let isDr=cell.getTable().element.id=="drJobsTable"
  ret.setAttribute("type", "button");
  if (cell.getData().jobID==-1) {
    ret.setAttribute("class", "btn addBtn btn-outline-primary");
    ret.innerHTML='<i class="fas fa-plus"></i>'
  }else {
    ret.setAttribute("class", "btn remBtn btn-outline-danger");
    ret.innerHTML='<i class="fas fa-minus"></i>'
  }
  ret.addEventListener('mousedown',function(event){
    tab=cell.getTable()
    if (cell.getData().jobID>-1) {
      if (checkJobDelete(cell.getData().jobID)) {
        updateJob('delete','Jobs',[],[],'jobID',cell.getData().jobID).then(function(e){
          updateNote('edit',cell.getData().jobID,'','jobTable',cell.getData().projectID)
          window.dispatchEvent(new CustomEvent("jobsChanged", {data: cell.getData()}))
          tab.deleteRow(cell.getRow())
        })
      }
    }else {
      var rowAdder=cell.getRow()
      var valFields=isDr?['jobName','startDate','endDate','interviewsTarget','audienceSelect','sponsorJobID']:['jobName','isJobHourly','startDate','endDate','dataDate','interviewsTarget','jobCPIselect','expectedLOI','audienceSelect','typeSelect']
      if (validateRow(rowAdder,valFields)) {
        if (validateRowIf(rowAdder,{typeSelect:'CATI'},['hourlyTarget','shiftSelect','isJobHourlyResource'])) {
          var jobData=jobDataFromRow(rowAdder)
          var jobID=addJob(jobData,cell.getRow().getData().jobCPIselect)
          if (jobID>0) {
            tab.addRow({}, true, rowAdder)
            .then(function(row){
              window.dispatchEvent(new CustomEvent("jobsChanged", {data: jobData}))
              row.update(rowAdder.getData())
              row.update({
                jobID:jobID
              })
              var obj={}
              Object.assign(obj, (isDr?blankDrRow:blankJobRow))
              rowAdder.update(obj)
              rowAdder.reformat()
            })
          }
        }
      }
    }
  })
  return ret
};
var groupingData={}
function jobDataFromRow(row){
  var cpi
  if (row.getData().sponsorJobID) {
    cpi=row.getData().jobCPI
  }else {
    cpi=row.getData().typeSelect.filter(el=>['CATI','Online','Face'].includes(el)).length>0?getCPIavg(row.getData().jobCPIselect,'CPI'):getCPIavg(row.getData().jobCPIselect,'DP')
  }
  console.log(row.getData(),row.getData().hoursTarget,row.getData().isJobHourly=='1',row.getData().isJobHourly=='1'?row.getData().hoursTarget:row.getData().interviewsTarget)
  var jobData={
    projectID:row.getData().projectID,
    jobName:row.getData().jobName,
    startDate:dateIf(row.getData().startDate,"-","r"),
    endDate:dateIf(row.getData().endDate,"-","r"),
    dataDate:dateIf(row.getData().dataDate,"-","r"),
    tablesDate:row.getData().tablesDate?dateIf(row.getData().tablesDate,"-","r"):'',
    interviewsTarget:Math.ceil(row.getData().isJobHourly=='1'?row.getData().hoursTarget:row.getData().interviewsTarget),
    jobCPI:cpi,
    CPIreduction:row.getData().CPIreduction,
    expectedLOI:row.getData().expectedLOI,
    isJobInHouse:row.getData().isJobInHouse?1:0,
    excludeFromDials:row.getData().excludeFromDials?1:0,
    isJobHourly:row.getData().isJobHourly,
    isJobHourlyResource:row.getData().isJobHourlyResource,
    hourlyTarget:row.getData().hourlyTarget,
    pdGroup:quoteName,
    plannerGroup:quoteName,
    sponsorJobID:row.getData().sponsorJobID,
    isJobDeskResearch:row.getData().typeSelect.includes("DeskResearch")
  }
  function addSelect(vals,field){
    var obj={}
    vals.forEach((val, i) => {
      obj['isJob'+val]=row.getData()[field].includes(val)?1:0
    });
    return obj
  }
  Object.assign(jobData, addSelect(shiftVals,'shiftSelect'))
  Object.assign(jobData, addSelect(audienceVals,'audienceSelect'))
  if (!row.getData().sponsorJobID) {
    Object.assign(jobData, addSelect(jobTypeVals,'typeSelect'))
  }
  console.log(jobData)
  return jobData
}
function addSpend(spendDate,unitValue,units,projectID,typeID,supplierID,PO,jobID){
  var data =[]
  var jsonData={};
  var vals=[]
  var returnID
  jsonData.spendDate=spendDate
  jsonData.unitValue=unitValue
  jsonData.units=units
  jsonData.projectID=projectID
  jsonData.typeID=typeID
  jsonData.jobID=jobID?jobID:'NULL'
  jsonData.PO=PO
  jsonData.supplierID=supplierID
  data.push(jsonData)
  return $.ajax({
      url: '/add-project-spend',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify(data),
      success: function (response) {
        returnID=response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return returnID
}

function addQuery(rowData){
  var cleanData={}
  for (const [key, value] of Object.entries(rowData)) {
    if (value!==undefined && value!=='' && value!==null) {
      cleanData[key]="'"+value+"'"
    }else {
      cleanData[key]="NULL"
    }
  }
  cleanData.query=rowData.query
  return $.ajax({
      url: '/add-project-query',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(cleanData),
      success: function (response) {
        addEventSeen('ProjectQueries',[response.id],[projectID])
        return response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}
function addJob(jobData,cpis){
  var vals=[]
  var returnID
  var cleanJobData={}
  for (const [key, value] of Object.entries(jobData)) {
    if (value!==undefined && value!=='' && value!==null) {
      cleanJobData[key]="'"+value+"'"
    }else {
      cleanJobData[key]="NULL"
    }
  }
  var data=[]
  data.push(cleanJobData)
  data.push(cpis)
  $.ajax({
      url: '/add-group-ajax',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify(data),
      success: function (response) {
        returnID=response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return returnID
}
function updateSpend(rowData){
  var data =[]
  data.push(rowData)
  return $.ajax({
      url: '/update-project-spend',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}
function getSuppliers(){
  var ret={}
  $.ajax({
      url: '/get-suppliers',
      type: 'GET',
      async: false,
      success: function (response) {
        if (response) {
          response.forEach((item, i) => {
            var key=item.supplierID.toString()
            var val=item.supplierName.toString()
            ret[key]=val
          });
        }
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return ret
}
function addSupplier(supplierName){
  var data =[]
  var jsonData={};
  jsonData.supplierName=supplierName
  data.push(jsonData)
  var ret={}
  $.ajax({
      url: '/add-supplier',
      type: 'POST',
      contentType: 'application/json',
      async: false,
      data: JSON.stringify(data),
      success: function (response) {
        ret=response.id
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return ret
}

function checkJobDelete(jid) {
  var ret=false
  if (confirm("Are you sure you want to delete this target group?")) {
    ret=true
    $.ajax({
        url: '/delete-group/'+jid,
        type: 'GET',
        contentType: 'application/json',
        success: function (response) {
        },
        error: function (jqXHR, exception) {
          alert(getErrorMessage(jqXHR, exception))
        },
    });
  }
  return ret;
}
function getjobCPIs(projectID,type){
  var ret={}
  $.ajax({
      url: '/get-job-cpis/'+projectID+'/'+type,
      type: 'GET',
      async: false,
      success: function (response) {
        if (response) {
          response.forEach((item, i) => {
            var key=item.costID.toString()
            var val=item.costName.toString()+" [£"+item.unitValue.toFixed(2)+"]"
            ret[key]=val
          });
        }
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
  return ret
}
var cpiFormatter=function(cell, formatterParams, onRendered){
  var ret=''
  if (cell.getValue()) {
    if (cell.getValue().length!=0) {
      var avg=cell.getData().typeSelect.filter(el=>['CATI','Online','Face'].includes(el)).length>0?getCPIavg(cell.getData().jobCPIselect,'CPI'):getCPIavg(cell.getData().jobCPIselect,'DP')
      ret='£'+avg.toFixed(2)
    }
  }
  return ret
}
function getCPIavg(input,type){
  var jobCPIs=getjobCPIs(projectID,type)
  var cpiArr=input.map(el=>jobCPIs[el]?jobCPIs[el].split('[')[1].replace(']','').replace('£',''):0)
  return cpiArr.reduce((a,b)=>a+Number(b),0)/cpiArr.length
}

function updateCPIs(costIDs,jobID){
  var data =[]
  var jsonData={};
  jsonData.costIDs=costIDs
  jsonData.jobID=jobID
  data.push(jsonData)
  return $.ajax({
      url: '/update-group-CPI',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function (response) {
      },
      error: function (jqXHR, exception) {
        alert(getErrorMessage(jqXHR, exception))
      },
  });
}

function addEventSeen(eventType,eventIDs,parentIDs){
  var data=[]
  for (var i = 0; i < eventIDs.length; i++) {
    data.push({
      eventType:eventType,
      eventID:eventIDs[i],
      parentID:parentIDs[i]
    })
  }
  return $.ajax({
    url: '/event-seen/',
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
    global:false,
    success: function(){
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  })
}
function updateQMcount(projectID){
  $.ajax({
    url: '/get-quickmode-queries/',
    type: 'POST',
    data: JSON.stringify({projectID:projectID}),
    contentType: 'application/json',
    global:false,
    success: function(response){
      if (response.queries.length>0) {
        $('#qm-replyCount').text(response.queries.length)
        $('#qm-replyCount').css('visibility','visible')
      }else {
        $('#qm-replyCount').text()
        $('#qm-replyCount').css('visibility','hidden')
      }
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  })
}
function addImg(b64,target,ext){
  return $.ajax({
    url: '/save-img',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({folder:target,b64:b64,ext:ext,isTemp:false}),
    success: function(resp){
      console.log(resp)
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
}
function addQueryImg(path,queryID,replyID){
  return $.ajax({
    url: '/add-query-img',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({src:path,queryID:queryID,replyID:replyID}),
    success: function(resp){
      console.log(resp)
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
}
function deleteQueryImg(path,queryID,replyID){
  return $.ajax({
    url: '/delete-query-img',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({src:path,queryID:queryID,replyID:replyID}),
    success: function(resp){
      console.log(resp)
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  });
}
function sendEmail(subject,body,emailTo,priority){
  $.ajax({
    url: '/send-email-ajax/',
    type: 'POST',
    data: JSON.stringify({subject:subject,HTMLbody:body,emailTo:emailTo,priority:priority}),
    contentType: 'application/json',
    success: function(response){
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  })
}
function getAvgWage(){
  return $.ajax({
    url: '/get-avg-wage/',
    type: 'GET',
    contentType: 'application/json',
    success: function(response){
    },
    error: function (jqXHR, exception) {
      alert(getErrorMessage(jqXHR, exception))
    },
  })
}
function changeDate(dateField,oldDate,newDate,jobID){
  $("body").append(`
    <div class='modal fade' role='dialog' id='dateChangeModal'>
      <div class='modal-dialog modal-dialog-centered' role='document' style="width: 360px;">
        <div class='modal-content'>
          <div class='modal-body' style="text-align:center">
            <input type="checkbox" value="1" checked id="dateIsConfirmed" name="dateIsConfirmed">
            <label for="dateIsConfirmed">Dates are confirmed</label><br>
            Why have the dates changed?<br><br>
            <button type='button' class='btn btn-primary reason' data-isByClient="1">Client's delay</button>
            <button type='button' class='btn btn-primary reason' data-isByClient="0">Our delay</button>
            <button type='button' class='btn btn-primary reason' data-isByClient="null">Correction</button>
          </div>
        </div>
      </div>
    </div>`)
    $('#dateChangeModal').modal("show")
    $('.reason').one('click',function(e){
      let data={}
      data.dateField=dateField
      data.oldDate=oldDate
      data.newDate=newDate
      data.isByClient=$(this).attr("data-isByClient")
      data.isConfirmed=$(this).parent().find("#isDateConfirmed").is(":checked")?1:0
      data.jobID=jobID
      $.ajax({
        url: '/change-job-date/',
        type: 'POST',
        data: data,
        success: function(response){
          $('#dateChangeModal').modal("hide")
          $('#dateChangeModal').on("bs.modal.hidden",function(e){
            $('#dateChangeModal').remove()
          })
        },
        error: function (jqXHR, exception) {
          alert(getErrorMessage(jqXHR, exception))
        },
      })
    })
}
let dateRangePicker=(c,onR,success,cancel)=>{
  let editor=document.createElement("input")
  let origSt=moment(c.getData().startDate).format("YYYY-MM-DD")
  editor.value=moment(c.getData().startDate).format("DD/MM/YYYY")+"-"+moment(c.getData().endDate).format("DD/MM/YYYY")
  onR(()=>{
    $(editor).daterangepicker({
      opens: 'left',
      locale: {
        format: "DD/MM/YYYY",
        seperator:"-"
      },
      startDate:c.getData().startDate?moment(c.getData().startDate):moment(),
      endDate:c.getData().endDate?moment(c.getData().endDate):moment(),
      showDropdowns:true,
      buttonClasses:'btn',
      applyButtonClasses:'btn-primary',
      cancelButtonClasses:'btn-secondary'
    }, function(start, end, label) {
      c.getRow().update({startDate:start.format("YYYY-MM-DD"),endDate:end.format("YYYY-MM-DD"),dataDate:dateIf(addBusinessDays(end,1),"-","r")}).then(e=>{
        if (c.getData().jobID>-1) {
          let d=c.getData()
          updateJob('update','Jobs',['startDate','endDate','dataDate'],[d.startDate,d.endDate,d.dataDate],'jobID',c.getData().jobID).then(function(e){
            success(start.format("YYYY-MM-DD")+"-"+end.format("YYYY-MM-DD"))
            changeDate('startDate',origSt,start.format("YYYY-MM-DD"),c.getData().jobID)
            window.dispatchEvent(new CustomEvent("jobsChanged", {data: c.getData()}))
          })
        }
      })
    })
  })
  $(editor).on('cancel.daterangepicker', function(ev, picker) {
    cancel()
  });
  $(editor).on('hide.daterangepicker', function(ev, picker) {
    cancel()
  });
  return editor
}
