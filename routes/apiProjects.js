const axios = require('axios');

module.exports = {
  apiProjects(req, res){
    let apiKey = '';
    let URL1 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Session";
    let data = {
      'username':'Matt',
      'password':'12345',
      'module':'dev'
    };
    axios.post(URL1, data)
    .then(response => {
      apiKey = response.data.Response.Token
      let headers = {
        'Content-type':'application/json',
        "Authorization": 'Basic ' + apiKey
      };
      let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/SurveyTasks/"
      axios.get(URL2, {headers: headers})
      .then(response => {
        APIprojects = response.data.Response
        res.render('api-projects.ejs', {
          projects: APIprojects,
          title: 'Projects from Askia Supervisor'
        })
      })
      .catch(error =>{
        res.redirect('/home')
      })
    })
    .catch(error =>{
      console.log("failed to connect to ASKIA API")
    })
  },
  apiSampleReports(req, res){
    console.log("Starting js")
    let apiKey = '';
    let id = req.params.id
    console.log(id)
    let URL1 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Session";
    let data = {
      'username':'Matt',
      'password':'12345',
      'module':'dev'
    };
    let searchTerm = {
      "ListIds": [],
      "MinimumContactIdOnFirstList": 1,
      "MaxResults": 10000,
      "NestedCondition": {
        "Conditions": [],
        "NestedConditions": [],
        "Operator": 0
      }
    };
    axios.post(URL1, data)
    .then(response => {
      apiKey = response.data.Response.Token
      console.log("Got API key: "+apiKey)
      let headers = {
        'Content-type':'application/json',
        "Authorization": 'Basic ' + apiKey
      };
      let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/SurveyTasks/" + id
      axios.get(URL2, {headers: headers})
      .then(response => {
        console.log("Got survey task")
        //get all lists associated with task
        TaskLists = response.data.Response.ListsSettings.Lists
        //push each list ID intro a search term
        TaskLists.forEach((list, index) => {
          console.log("Pushing ID: "+list.ListId)
          searchTerm.ListIds[index] = list.ListId;
        });
        //send find/edit contacts request
        let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Lists/FindContacts"
        axios.post(URL2,searchTerm,{headers: headers})
        .then(response => {
          console.log("Sent find/edit request")
          //check response
          console.log("Response: "+response.data.Response)
          let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Lists/FindContacts/" + response.data.Response + "/Status"
          let reportID = response.data.Response
          axios.get(URL2, {headers: headers})
          .then(response => {
            let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Lists/FindContacts/" + reportID
            axios.get(URL2, {headers: headers})
            .then(response =>{
              console.log("Sent download request: "+ URL2)
              Sample=response.data.Response;
              console.log("Response: " + JSON.stringify(Sample))
            })
          });
        });
        res.render('api-sample-reports.ejs', {
          listIDs: Lists,
          sample: Sample,
          title: 'Projects from Askia Supervisor'
        })
      })
      .catch(error =>{
        res.redirect('/home')
      })
    })
    .catch(error =>{
      console.log("failed to connect to ASKIA API")
    })
  },
  apiDailySelect(req, res){
    res.render('api-daily-select.ejs', {
      message: "",
      title: "Select a date to view"
    })
  },
  apiDailyView(req, res){
    let date = req.params.date;
    let type = req.params.type;
    let startTime = type == "d" ? "T00:00:01.999" : type == "e" ? "T12:59:59.999" : "T00:00:01.999";
    let endTime = type == "d" ? "T17:00:00.000" : "T23:59:59.999" ;
    let agents = [];
    let calls = [];
    let projects = [];
    let apiKey = '';
    let URL1 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Session";
    let data = {
      'username':'Matt',
      'password':'12345',
      'module':'dev'
    };
    axios.post(URL1, data)
    .then(response => {
      apiKey = response.data.Response.Token
      let headers = {
        'Content-type':'application/json',
        "Authorization": 'Basic ' + apiKey
      };
      let URL2 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/SurveyTasks/"
      axios.get(URL2, {headers: headers})
      .then(response => {
        projects = response.data.Response
        let searchTerm = {
         "Operator": "AND",
         "Conditions": [
          {
              "Relation": 2,
              "Param": 2,
              "Value": date + startTime
          },
          {
              "Relation": 1,
              "Param": 2,
              "Value": date + endTime
          }
         ]
        }
        let URL3 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Calls?MaxResults=100000&FindCallNestedCondition=" + encodeURIComponent(JSON.stringify(searchTerm))
        axios.get(URL3, {headers: headers})
        .then(response => {
          calls = response.data.Response
          let URL4 = "https://survey.teamsearchsurvey.co.uk/CcaWebApi/Agents/"
          axios.get(URL4, {headers: headers})
          .then(response => {
            agents = response.data.Response
            res.render('api-calls.ejs', {
              projects: projects,
              calls: calls,
              agents: agents,
              title: 'Calls from Askia Supervisor',
              date: date
            })
          })
          .catch(error =>{
            console.log(error)
            res.redirect('/home')
          })
        })
        .catch(error =>{
          console.log(error)
          res.redirect('/home')
        })
      })
      .catch(error =>{
        console.log(error)
        res.redirect('/home')
      })
    })
    .catch(error =>{
      console.log("failed to connect to ASKIA API")
      es.redirect('/home')
    })
  }
}
