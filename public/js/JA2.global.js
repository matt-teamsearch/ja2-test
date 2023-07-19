  (function ( $ ) {
    $.fn.loader=function(params){
      throw new TypeError()
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
          info: "No alert to show"
        }, params );
        el=jQuery.parseHTML(`
          <div class="alertBanner">
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
