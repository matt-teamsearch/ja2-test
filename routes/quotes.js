const express = require('express');

module.exports = {

  searchQuotesPage: (req, res) => {
    let query="SELECT YEAR(quoteDate) AS 'yearquoted' FROM Quotes WHERE YEAR(quoteDate) > '2000' GROUP BY YEAR(quoteDate) ORDER BY YEAR(quoteDate) DESC";
    db.query(query, (err, result) => {
      if(err){
        res.redirect("back")
      }
      res.render('quote-search.ejs', {
        title: "Search Quotes"
        ,quoteyears: result.recordset
        ,message: ""
      });
    });
  },

  getQuotes: (req, res) => {
    let startDate = req.params.start;
    let endDate = req.params.end;
    let query = "SELECT Clients.clientName, Clients.clientID, COUNT(Quotes.quoteID) AS 'totalquotes', COUNT(CASE Quotes.isQuoteAsBusiness WHEN 1 THEN 1 ELSE NULL END) AS 'B2BProject', COUNT(CASE Quotes.isQuoteAsConsumer WHEN 1 THEN 1 ELSE NULL END) AS 'ConsumerProject', COUNT(CASE Quotes.isQuoteAsCATI WHEN 1 THEN 1 ELSE NULL END) AS 'CATIProject', COUNT(CASE Quotes.isQuoteAsRecruitment WHEN 1 THEN 1 ELSE NULL END) AS 'RecruitProject', COUNT(CASE Quotes.isQuoteAsFace WHEN 1 THEN 1 ELSE NULL END) AS 'F2FProject', COUNT(CASE Quotes.isQuoteAsOnline WHEN 1 THEN 1 ELSE NULL END) AS 'OnlineProject', COUNT(CASE Quotes.isQuoteAsInternational WHEN 1 THEN 1 ELSE NULL END) AS 'InternationalProject', COUNT(CASE Quotes.isQuoteAsDP WHEN 1 THEN 1 ELSE NULL END) AS 'DPProject', COUNT(CASE WHEN Quotes.isQuoteAsOnline = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'OnlineProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsInternational = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'InternationalProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsDP = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'DPProjectsConverted', COUNT(CASE WHEN Quotes.isQuoteAsFace = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'F2FProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsRecruitment = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'RecruitProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsCATI = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'CATIProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsBusiness = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'B2BProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsConsumer = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'ConsumerProjectConverted', COUNT(CASE WHEN (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'ProjectConverted' FROM Quotes LEFT JOIN Clients ON Quotes.clientID = Clients.clientID LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate >= '" + startDate + "' and Quotes.quoteDate <= '" + endDate + "' GROUP BY Clients.clientID, Clients.clientName ORDER BY Clients.clientName"
    db.query(query, (err, result) => {
      if(err){
        res.redirect("back")
      }
      res.render('quotes.ejs', {
        title: "Quote Overview"
        ,numbers: result.recordset
        ,message: ""
      });
    });
  },

  getClientQuotes: (req, res) => {
    let startDate = req.params.start;
    let endDate = req.params.end;
    let qClient = req.params.client;
    let query = "SELECT Clients.clientName, Clients.clientID, COUNT(Quotes.quoteID) AS 'totalquotes', COUNT(CASE Quotes.isQuoteAsBusiness WHEN 1 THEN 1 ELSE NULL END) AS 'B2BProject', COUNT(CASE Quotes.isQuoteAsConsumer WHEN 1 THEN 1 ELSE NULL END) AS 'ConsumerProject', COUNT(CASE Quotes.isQuoteAsCATI WHEN 1 THEN 1 ELSE NULL END) AS 'CATIProject', COUNT(CASE Quotes.isQuoteAsRecruitment WHEN 1 THEN 1 ELSE NULL END) AS 'RecruitProject', COUNT(CASE Quotes.isQuoteAsFace WHEN 1 THEN 1 ELSE NULL END) AS 'F2FProject', COUNT(CASE Quotes.isQuoteAsOnline WHEN 1 THEN 1 ELSE NULL END) AS 'OnlineProject', COUNT(CASE Quotes.isQuoteAsInternational WHEN 1 THEN 1 ELSE NULL END) AS 'InternationalProject', COUNT(CASE WHEN Quotes.isQuoteAsOnline = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'OnlineProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsInternational = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'InternationalProjectConverted', COUNT(CASE Quotes.isQuoteAsDP WHEN 1 THEN 1 ELSE NULL END) AS 'DPProject', COUNT(CASE WHEN Quotes.isQuoteAsDP = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'DPProjectsConverted', COUNT(CASE WHEN Quotes.isQuoteAsFace = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'F2FProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsRecruitment = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'RecruitProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsCATI = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'CATIProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsBusiness = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'B2BProjectConverted', COUNT(CASE WHEN Quotes.isQuoteAsConsumer = 1 AND (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'ConsumerProjectConverted', COUNT(CASE WHEN (Projects.isProjectCommissioned = 1 OR Projects.isProjectLive = 1 OR Projects.isProjectClosed = 1 OR Projects.isProjectCancelled = 1) THEN 1 ELSE NULL END) AS 'ProjectConverted' FROM Quotes LEFT JOIN Clients ON Quotes.clientID = Clients.clientID LEFT JOIN Projects ON Quotes.quoteID = Projects.quoteID WHERE Quotes.quoteDate >= '" + startDate + "' and Quotes.quoteDate <= '" + endDate + "' AND Clients.clientID = '" + qClient + "' GROUP BY Clients.clientID, Clients.clientName";
    db.query(query, (err, result) => {
      if (result.recordset.length > 0) {
        res.render('client-quotes.ejs', {
          title: "Quote Overview"
          ,numbers: result.recordset
          ,message: ""
        });
      }
      else
      {
        let query = "SELECT * FROM Clients ORDER BY clientName ASC";
        db.query(query, (err, result) => {
          if (err) {
            //res.redirect("/home");
          }
          res.render('view-clients.ejs', {
            title: "View Clients"
            ,clients: result.recordset
            ,message: "No quotes found for selected dates"
          });
        });
      }
    });
  },

  getClientFilteredQuotes: (req, res) => {
    let startDate = req.params.start;
    let endDate = req.params.end;
    let qClient = req.params.client;
    let qFilter = req.params.number;
    let queryText = ["", "Quotes.isQuoteAsBusiness = '1'", "Quotes.isQuoteAsConsumer = '1'", "Quotes.isQuoteAsFace = '1'", "Quotes.isQuoteAsCATI = '1'", "Quotes.isQuoteAsOnline = '1'", "Quotes.isQuoteAsInternational = '1'", "Quotes.isQuoteAsRecruitment = '1'", "Quotes.isQuoteAsDP = '1'"]
    let query = "SELECT * FROM Quotes JOIN Clients ON Quotes.clientID = Clients.clientID WHERE Quotes.quoteDate >= '" + startDate + "' AND Quotes.quoteDate <= '" + endDate + "' AND Quotes.clientID ='" + qClient + "' and " + queryText[qFilter];
    db.query(query, (err, result) => {
      res.render('client-filtered-quotes.ejs', {
        title: "Quote Overview"
        ,quotes: result.recordset
        ,message: ""
      });
    });
  },

  deleteQuote:(req, res) => {
    let quoteId = req.params.id;
    let checkForProject = "SELECT * FROM Projects WHERE Projects.quoteId = " + quoteId
    db.query(checkForProject, (err, result) =>{
      if(result.recordset.length > 0){
        res.redirect("/overview/"+quoteId)
      } else {
        let deleteQuery = "DELETE FROM Quotes WHERE Quotes.quoteId = " + quoteId
        db.query(deleteQuery, (err, result) =>{
          if(err){
            logger.info(req.user.uName + " failed to delete quote ID " + quoteId);
          } else {
            logger.info(req.user.uName + " deleted quote ID " + quoteId);
            res.redirect("/home")
          }
        });
      }
    });
  }
}
