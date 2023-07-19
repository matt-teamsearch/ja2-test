let agentsList=[]
let getAgents=()=>{
  return new Promise((res,rej)=>{
    if (agentsList.length==0) {
      $.ajax({
        url:'/all-agents-raw',
        type:'get',
        success:agents=>{
          agentsList=agents
          res(agents)
        }
      })
    }else {
      res(agentsList)
    }
  })
}
let undedicateAgent=(c)=>{
  return $.ajax({url:'/undedicate-agent/'+c.getData().dedicationID})
}
let agentSelect=(c,onR,success,cancel)=>{
  let select=jQuery.parseHTML(`<select class="selectpicker" id="agentSelect" data-live-search="true"><option value=""></option></select>`)
  onR(()=>{
    getAgents().then(a=>{
      a.filter(el=>(el.isDay?true:false)==(c.getData().isJobDay?true:false)).forEach((agent, i) => {
        let opt=new Option(agent.agentName,agent.agentID)
        if (c.getTable().getData().map(el=>el.agentID).includes(agent.agentID)) {
          $(opt).prop('disabled',true)
        }
        $(select).append(opt)
      });
      $(select).on('loaded.bs.select',function(e){
        setTimeout(()=>{
          $('[data-id="agentSelect"]').click()
        },1)
      })
      $(select).selectpicker({container:'body',width:'100%'})
      $(select).selectpicker('refresh')
    })
  })
  $(select).on('change',function(e){
    let v=$(select).selectpicker('val')
    $(select).selectpicker('destroy')
    $(select).remove()
    success(v)
  })
  $(select).on('hidden.bs.select',function(e){
    $(select).selectpicker('destroy')
    $(select).remove()
    cancel()
  })
  return select[0]
}
var dateEditor=(c,onR,success,cancel)=>{
  var editor = document.createElement("input");
  editor.setAttribute("type", "date");
  editor.style.padding = "3px";
  editor.style.width = "100%";
  editor.style.height = "100%";
  editor.value = c.getValue()
  onR(function(){
    editor.focus();
    editor.style.css = "100%";
  });
  function successFunc(){
    success(editor.value);
  }
  editor.addEventListener("change", successFunc);
  editor.addEventListener("blur", successFunc);
  return editor;
};
var datesSelect=(c,onR,success,cancel)=>{
  let input=document.createElement("input")
  input.type="text"
  input.style.color="white"
  let holdingDiv=document.createElement("div")
  holdingDiv.style.width = "100%";
  holdingDiv.style.height = "100%";
  let infoDiv=document.createElement("div")
  infoDiv.style.position="absolute"
  infoDiv.style.left="4px"
  infoDiv.style.top="0px"
  infoDiv.style.color="gray"
  $(input).addClass("dedicatedDates")
  $(holdingDiv).append(input).append(infoDiv)
  let origDates=[...c.getValue()]
  let isTGdates=_.isEqual(origDates,[null])
  console.log(isTGdates,origDates)
  let dates=[...(c.getValue() || [])].length?c.getValue():new Array()
  console.log("creating input",origDates)
  if (isTGdates) {
    let jobDates=moment.range(c.getData().jobStart,c.getData().jobEnd)
    dates=Array.from(jobDates.by('day')).map(d=>moment(d).format("YYYY-MM-DD"))
  }
  infoDiv.innerHTML=dates.length+" dates selected"
  onR(()=>{
    console.log("rendered input",origDates)
    function addOrRemoveDate(date) {
      var index = jQuery.inArray(date, dates);
      if (index >= 0){
        dates.splice(index, 1);
      }else{
        if (jQuery.inArray(date, dates) < 0) {
          dates.push(date)
        }
      }
    }
    $(c.getElement()).loader()
    $.ajax({url:'/get-dedicated-dates/'+c.getData().dedicationID+'/'+c.getData().agentID,global:false,success:deds=>{
      let tgDeds=deds.filter(el=>el.dedicatedDate==null)
      tgDeds.forEach((ded, i) => {
        let jobDates=moment.range(ded.startDate,ded.endDate)
        let arr=Array.from(jobDates.by('day')).map(d=>moment(d).toISOString())
        deds=deds.concat(arr.map(d=>({...ded,dedicatedDate:d})))
      });
      deds=deds.filter(el=>el.dedicatedDate)
      let getBtnPane=()=>{
        let jobDatesBtn=jQuery.parseHTML(`<button class="btn btn-secondary btn-sm">Follow target group dates</button>`)
        let thisRange=moment.range(c.getData().jobStart,c.getData().jobEnd)
        let dedsRange=deds.map(el=>el.dedicatedDate)
        if (_.intersectionWith(Array.from(thisRange.by('day')),dedsRange,(a,b)=>a.isSame(b,'day')).length) {
          $(jobDatesBtn).prop('disabled',true).css('pointer-events','all')
          $(jobDatesBtn).attr('title',"Target group's dates overlap with agent's other dedications.")
        }
        if (isTGdates) {
          $(jobDatesBtn).prop('disabled',true).css('pointer-events','all')
          $(jobDatesBtn).attr('title',"Already following target group dates.")
        }
        $(jobDatesBtn).on('click',function(){
          $('#ui-datepicker-div').remove()
          success([null])
          $(input).blur()
        })
        let clearDatesBtn=jQuery.parseHTML(`<button class="btn btn-light btn-sm">Clear all</button>`)
        $(clearDatesBtn).on('click',function(){
          dates=new Array()
          $('#ui-datepicker-div').remove()
          success([])
          $(input).blur()
        })
        let btnCont=document.createElement("div")
        $(btnCont).css({
          display: "flex",
          "justify-content": "space-evenly",
          padding:"10px 3px",
        })
        $(btnCont).append(jobDatesBtn).append(clearDatesBtn)
        $(input).datepicker("widget").append(btnCont)
        return btnCont
      }
      $(c.getElement()).loader("done")
      $(input).datepicker({
        onSelect: function (dateText, inst) {
          let updateDates=()=>{
            addOrRemoveDate(dateText);
            $(this).datepicker('refresh')
            $(this).data('datepicker').inline = true;
            infoDiv.innerHTML=dates.length+" dates selected"
            setTimeout(getBtnPane,1)
          }
          if (isTGdates) {
            if (confirm("Manual editing will un-link these dates from the target group dates. Continue manual editing?")) {
              updateDates()
              isTGdates=false
            }
          }else {
            updateDates()
          }
        },
        autoclose: false,
        dateFormat: "yy-mm-dd",
        onClose:(dateText,inst)=>{
          if (origDates.sort().join(",")==dates.sort().join(",") || isTGdates) {
            cancel()
          }else {
            success(dates)
          }
          $(input).blur()
        },
        beforeShow:(input)=>{
          setTimeout(getBtnPane,1)
        },
        beforeShowDay: function (date) {
          let dte=moment(date).format("YYYY-MM-DD")
          var gotDate = jQuery.inArray(dte, dates);
          let alreadyDedicated=deds.find(el=>el.dedicatedDate.split("T")[0]==dte)
          if (gotDate >= 0) {
            return [true,"ui-state-selected"];
          }else if(alreadyDedicated) {
            return [false,"","Currently dedicated to "+alreadyDedicated.jobName];
          }else {
            return [true,""];
          }
        }
      }).datepicker("show");
    }})
  })
  return holdingDiv
}
$('.teamsTable').each(function(e){
  let table=this
  let jobID=$(table).attr("data-jobID")
  const teamsTable = new Tabulator(table, {
    ajaxURL:'/get-dedicated-team/'+jobID,
    autoResize:false,
    layout:"fitColumns",
    height:400,
    layoutColumnsOnNewData:true,
    index:"agentID",
    headerSort:false,
    ajaxResponse:(url,p,resp)=>{
      console.log(resp)
      agentsList=resp.agents
      resp.team.push({dedicationID:-1})
      return resp.team.map(el=>({...el,...{jobID:jobID,agent:agentsList.find(a=>a.agentID==el.agentID),isJobDay:$(table).attr("data-isJobDay")=='true',jobStart:$(table).attr("data-startDate"),jobEnd:$(table).attr("data-endDate")}}))
    },
    columns:[
      {field:"avatar",width:80,hozAlign:'center',mutator:(v,d)=>{
        let b=d.agent?d.agent.breatheAgent:null
        return b?b.photo_url:''
      },formatter:c=>c.getValue()?`<img class="avatarImg" style="border-radius:50%;height:43px;" src="`+c.getValue()+`">`:''},
      {title:"Agent",headerSort:true,sorter:(a,b,aR,bR,c,d)=>{
        let av=(agentsList.find(ag=>ag.agentID==a) || {}).agentName
        let bv=(agentsList.find(ag=>ag.agentID==b) || {}).agentName
        // console.log(a,b,(agentsList.find(ag=>ag.agentID==a) || {}).agentName,(agentsList.find(ag=>ag.agentID==b) || {}).agentName,(agentsList.find(ag=>ag.agentID==a) || {agentName:''}).agentName.localeCompare((agentsList.find(ag=>ag.agentID==b) || {agentName:''}).agentName),d)
        let down=d=='asc'?1:-1
        let up=d=='desc'?1:-1
        return !av?down:(!bv?up:av.localeCompare(bv))
        // return !a?up:(!b?down:agentsList.find(ag=>ag.agentID==a).agentName.localeCompare(agentsList.find(ag=>ag.agentID==b).agentName))
      },field:"agentID",formatter:c=>c.getValue()?checkFind(agentsList.find(a=>a.agentID==c.getValue())).agentName:'Select an agent...',editable:c=>c.getData().dedicationID==-1,editor:agentSelect},
      // {field:"briefingDate",title:"Briefing Date",mutator:v=>v?moment(v).format('YYYY-MM-DD'):'',editable:c=>c.getData().dedicationID>-1,editor:dateEditor,formatter:'datetime',formatterParams:{outputFormat:"DD/MM/YYYY"}},
      {field:'dedicatedDates',title:"Dates Dedicated",editable:c=>c.getData().dedicationID>-1,mutator:v=>(v || []),formatter:c=>_.isEqual(c.getValue(),[null])?"All dates":c.getValue().length+" dates",editor:datesSelect},
      {title:"Auto-allocate",width:112,hozAlign:'center',field:"autoAllocate",editable:c=>c.getData().dedicationID>-1,formatter:'tickCross',cellClick:(e,c)=>{
        if (c.getData().dedicationID>-1) {
          c.setValue(c.getValue()?false:true)
        }
      }},
      {cssClass:'addRemCol',width:40,formatter:c=>{
        let v=''
        if (c.getData().dedicationID>-1) {
          let btn=jQuery.parseHTML(`<button type="button" class="remBtn btn btn-flat btn-danger"><i class="fas fa-trash-alt"></i></button>`)
          $(btn).click(()=>{
            $(c.getElement()).loader()
            $.ajax({url:'/undedicate-agent/'+c.getData().dedicationID,global:false,error:(j,ex)=>alert(getErrorMessage(j,ex))}).then(e=>{
              teamsTable.replaceData('/get-dedicated-team/'+jobID)
            })
          })
          v=btn[0]
        }
        return v
      }}
    ],
    cellEdited:function(c){
      var d=c.getRow().getData()
      if (d.dedicationID>-1) {
        $(c.getElement()).loader()
        if (c.getField()=='dedicatedDates') {
          $.ajax({
            url:'/update-dedicated-dates/'+d.dedicationID,
            type:'POST',
            global:false,
            data:{dates:c.getValue()},
            success:()=>teamsTable.replaceData('/get-dedicated-team/'+jobID)
          })
        }else {
          updateJob('update','dedicatedTeams',['briefingDate','autoAllocate'],[d.briefingDate?moment(d.briefingDate).format("YYYY-MM-DD"):null,d.autoAllocate?1:0],'dedicationID',d.dedicationID,true).then(e=>$(c.getElement()).loader('done'))
        }
      }else if (d.agentID) {
        $(c.getElement()).loader()
        $.ajax({
          url:'/dedicate-agent',
          type:'POST',
          global:false,
          data:d,
          success:()=>teamsTable.replaceData('/get-dedicated-team/'+jobID)
        })
      }
    },
  })
})
