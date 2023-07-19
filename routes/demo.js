module.exports = {

  demoPage: (req, res) => {
    res.render('demopage.ejs',{
      message: '',
      title: 'demo page'
    });
  },
};
