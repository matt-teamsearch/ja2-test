$(document).on('click', '#createEmail', function(evt) {
  if (verify()) {
    var email = 'teamsearchmr@teamsearchmr.com';
    var subject = 'New Project Commissioned - '+$('#quoteNo').val()+" "+$('#quoteName').val();
    var data={}
    data['XProject_number_XProject_name']=$('#quoteNo').val()+" "+$('#quoteName').val()
    data.XPm=$('#projectCM option:selected').text().split(" ")[0]
    data.XDp=$('#projectDP option:selected').text().split(" ")[0]
    data.XInfo_Notes=$('#projectNotes-0').trumbowyg('html')
    data.XScreener_Notes=$('#projectNotes-1').trumbowyg('html')
    data.XQnaire_Notes=$('#projectNotes-2').trumbowyg('html')
    data.XQuota_Notes=$('#projectNotes-3').trumbowyg('html')
    data.XSample_Notes=$('#projectNotes-4').trumbowyg('html')
    data.XDeliverables_Notes=$('#projectNotes-5').trumbowyg('html')
    data.XSchedule_Notes=$('#projectNotes-6').trumbowyg('html')
    data.Xclient=$('#Client option:selected').text().split(' @ ')[1]
    var jobsData=Tabulator.prototype.findTable('#jobsTable')[0].getData().filter(el=>el.jobID>-1)
    data.XInt_length=jobsData.map(el=>el.jobName+': '+el.expectedLOI).join(", ")
    data.XMethodology=jobsData.map(el=>el.jobName+': '+el.typeSelect.join('/')).join(", ")
    data.Xblind=$('identified').prop('checked')?"Identified":"Blind"
    data.Xaudience=jobsData.map(el=>el.jobName+': '+el.audienceSelect).join(", ")
    data.Xtarget=jobsData.filter(el=>el.typeSelect.includes("CATI")).map(el=>el.jobName+': '+el.hourlyTarget).join(", ")
    data.XResource=data.Xtarget
    var costs=[]
    var costsTable = Tabulator.prototype.findTable('#costsTable')[0];
    costsTable.getRows().forEach((row, i) => {
      if (row.getData().costID>-1) {
        var costRow={}
        var costName=row.getData().costName
        if (row.getData().sqlCol=="") {
          costName=costTypeVals[row.getData().costType].split(" [")[0]+" - "+row.getData().costName
        }
        costRow.costName=costName
        costRow.costValue="£"+(Number(row.getData().costUnits)*Number(row.getData().costUnitValue)).toFixed(0)
        costRow.units=row.getData().costUnits
        costRow.unitValue="£"+Number(row.getData().costUnitValue).toFixed(0)
        costs.push(costRow)
      }
    });
    data.XtotalCost=costs.reduce((a,b)=>a+(Number(b.units)*Number(b.unitValue)),0)
    data.costRows=costs
    var ints=0
    $('.jobInts').each(function(i){
      if(Number($(this).text())>0){
        ints=ints+Number($(this).text())
      }
    })
    data.XNumber_of_interviews=ints
    data.XStart_date=dateIf(new Date(Math.min.apply(null,jobsData.map(el=>new Date(el.startDate)))),"/","f")
    data.XEnd_date=dateIf(new Date(Math.max.apply(null,jobsData.map(el=>new Date(el.endDate)))),"/","f")
    var source="<ul><li>"+data.XPm+"'s project</li>"
    source=source+"<li>"+data.XDp+" managing production</li>"
    source=source+"<li>Background:"+data.XInfo_Notes+"</li>"
    source=source+"<li>Questionnaire:"+data.XQnaire_Notes+"</li>"
    source=source+"<li>Screeners:"+data.XScreener_Notes+"</li>"
    source=source+"<li>Quotas:"+data.XQuota_Notes+"</li>"
    source=source+"<li>Sample:"+data.XSample_Notes+"</li>"
    source=source+"<li>Deliverables:"+data.XDeliverables_Notes+"</li>"
    source=source+"<li>Schedule:"+data.XSchedule_Notes+"</li>"
    source=source+"<li>Quality control:<ul><li>Usual protocols</li></ul></li>"
    source=source+"</ul>"
    source=source+"<br><br><b>Client: </b>"+data.Xclient
    source=source+"<br><br><b>LOI: </b>"+data.XInt_length
    source=source+"<br><br><b>Type: </b>"+data.XMethodology
    source=source+"<br><br><b>Reporting link needed?: </b>Y"
    source=source+"<br><br><b>Reveal client in intro?: </b>"+data.Xblind
    source=source+"<br><br><b>Audience: </b>"+data.Xaudience
    source=source+"<br><br><b>Target: </b>"+data.Xtarget
    source=source+"<br><br><b>Resource planner: </b>"+data.XResource
    source=source+"<br><br><b>Interviews: </b>"+data.XNumber_of_interviews
    source=source+"<br><br><b>Deadlines: </b>"+data.XStart_date+" to "+data.XEnd_date
    source=source+"<br><br><b>Costs: </b>"
    source=source+"<table style='border:2px solid black'>"
    source=source+"<tr>"
    var tdStyle='border-collapse:collapse'
    source=source+"<td style='"+tdStyle+";width:500px'><b>Total costs</b></td>"
    source=source+"<td style='"+tdStyle+";'></td>"
    source=source+"<td colspan='3' style='"+tdStyle+";color:white;background-color:red'>Notes (break out any info/costs below)</td>"
    source=source+"</tr>"
    source=source+"<tr><td colspan='5' style='"+tdStyle+";'><b> (including all sample, coding & tabs - if relevant)</b></td></tr>"
    data.costRows.forEach((costRow, i) => {
      source=source+"<tr>"
      source=source+"<td style='"+tdStyle+";'>"+costRow.costName+"</td>"
      source=source+"<td style='"+tdStyle+";text-align:right'>"+costRow.costValue+"</td>"
      source=source+"<td style='"+tdStyle+";text-align:right'>"+costRow.units+"</td>"
      source=source+"<td style='"+tdStyle+";text-align:center;width:10px'>X</td>"
      source=source+"<td style='"+tdStyle+";text-align:left'>"+costRow.unitValue+"</td>"
      source=source+"</tr>"
    });

    var emlContent = "data:message/rfc822 eml;charset=utf-8,";
    emlContent += 'To: '+email+'\n';
    emlContent += 'Subject: '+subject+'\n';
    emlContent += 'X-Unsent: 1'+'\n';
    emlContent += 'Content-Type: text/html'+'\n';
    emlContent += ''+'\n';
    emlContent += source;
    var encodedUri = encodeURI(emlContent); //encode spaces etc like a url
    var a = document.createElement('a'); //make a link in document
    var linkText = document.createTextNode("fileLink");
    a.appendChild(linkText);
    a.href = encodedUri;
    a.id = 'fileLink';
    a.download = 'filename.eml';
    a.style = "display:none;"; //hidden link
    document.body.appendChild(a);
    document.getElementById('fileLink').click(); //click the link
    // fetch('/templates/Commission email template.htm')
    //  .then((response) => response.text())
    //  .then((template) => {
    //   var rendered = Mustache.render(template, data);
    //  });
  }
})
