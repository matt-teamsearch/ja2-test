
var contactContextMenu = [
{
  label:"Call mobile",
  action:function(e, cell){
    tel(cell.getData().telnum)
  }
},
{
  label:"Call extension",
  action:function(e, cell){
    tel(cell.getData().ext)
  }
},
{
  label:"Email",
  action:function(e, cell){
    mailto(cell.getData().email)
  }
},
{
  label:"Copy mobile number",
  action:function(e, cell){
    copyTxt(cell.getData().telnum)
  }
},
{
  label:"Copy extension",
  action:function(e, cell){
    copyTxt(cell.getData().ext)
  }
},
{
  label:"Copy email address",
  action:function(e, cell){
    copyTxt(cell.getData().email)
  }
},
]
let nameHover=(cell,p,onRendered)=>{
  let hoverSpan=`
  <span class="contacts">
    <button class="btn btn-sm btn-outline-light contactBtn" `+(cell.getData().isAdmin===false?'disabled':'')+` data-id="2" type="button" title="Send email">
      <i class="far fa-envelope"></i>
    </button>
    <button class="btn btn-sm btn-outline-light contactBtn" `+(cell.getData().isAdmin===false?'disabled':'')+` data-id="0" type="button" title="Call mobile">
      <i class="fas fa-phone"></i>
    </button>
    <button class="btn btn-sm btn-outline-light contactBtn rcPhone" `+(cell.getData().isWorkingNow && cell.getData().isAdmin!==false?'':'disabled')+` data-id="1" type="button" title="Call RingCentral extension">
      <i class="fas fa-phone"></i>
    </button>
  </span>`
  onRendered(()=>{
    $(cell.getElement()).find('.contactBtn').on('click',function(){
      contactContextMenu[$(this).attr("data-id")].action(null,cell)
    })
  })
  return `<span class="nameHover"><span class="name `+(cell.getData().isAdmin===false?'redacted':'')+`">`+cell.getValue()+`</span>`+hoverSpan+`</span>`
}
let redactedAccessor=(val,data)=>data.isAdmin===false?'[REDACTED]':val
