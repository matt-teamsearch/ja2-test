$(document).ready(function () {
  var jobsTable = Tabulator.prototype.findTable('#jobsTable')[0];
  $(".groupingTables").each(function(){
    var groupingTables={}
    var groupType=$(this).attr("data-group")
    var id=this.id
    groupingTables[id] = new Tabulator('#'+id, {
      ajaxURL:"/get-job-groupings/"+projectID+"/"+groupType.toLowerCase()+"Group",
      autoResize:true,
      layout:"fitColumns",
      index:"jobID",
      groupBy:groupType.toLowerCase()+"Group",
      headerSort:false,
      groupUpdateOnCellEdit:true,
      groupContextMenu:[
        {
          label:"Rename "+groupType+' Group',
          action:function(e, group){
            var myDiv = document.createElement("div");
            myDiv.id = 'renameModalCont'
            myDiv.innerHTML=`
            <div class='modal fade' role='dialog' id='renameModal'>
              <div class='modal-dialog modal-dialog-centered' style="width:fit-content;text-align: center;" role='document'>
                <div class='modal-content'>
                  <div class='modal-body' id='modal-body'>
                  <input type="text" id="renameGroup" style="width:500px" value="`+group.getKey()+`"/>
                  <button type="button" class="btn btn-sm btn-primary" id="renameGroupBtn">Rename</button>
                  </div>
                </div>
              </div>
            </div>`
            document.body.appendChild(myDiv);
            $('#renameModal').modal("show")
            $('#renameGroup').on('keydown', function(evt) {
              if (event.key === "Enter") {
                $('#renameGroupBtn').click()
              }
            })
            $('#renameGroupBtn').on('click',function(e){
              group.getRows().forEach((row, i) => {
                row.getCell(groupType.toLowerCase()+"Group").setValue($('#renameGroup').val())
              });
              $('#renameModal').modal("hide")
            })
            $('#renameModal').on('hidden.bs.modal', function(evt) {
              $('#renameModalCont').remove()
            })
          }
        },
      ],
      rowFormatter:function(row){
        rowStyle(row.getData().jobID,row)
      },
      columns:[
        {title:"jobID", visible:false, field:"jobID"},
        {title:"Target Group", field:"jobName"},
        {title:groupType+' Group', field:groupType.toLowerCase()+"Group", editor:"select", editable: true, editorParams:function(cell){
          var groupNames=cell.getTable().getGroups().filter(el=>el.getKey()).map(el=>el.getKey())
          groupNames.push("Add...")
          return {values:groupNames}
        }},
      ],
      rowUpdated:function(row){
        // this.redraw(true)
      },
      cellEdited:function(cell){
        if (cell.getValue()=="Add...") {
          cell.setValue(quoteName+" - "+cell.getData().jobName)
          // var groupNames=cell.getTable().getGroups().filter(el=>el.getKey()).map(el=>el.getKey())
          // groupNames.push(quoteName+" - "+cell.getData().jobName)
          // this.setGroupValues([groupNames]);
        }
        updateJob('update','Jobs',[groupType.toLowerCase()+'Group'],[cell.getValue()],'jobID',cell.getData().jobID)
      }
    })
    window.addEventListener("jobsChanged", function(e) {
      groupingTables[id].setData()
    });
  })
})
