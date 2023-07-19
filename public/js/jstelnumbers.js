/*==============================================================================

This routine checks the value of the string variable specified by the parameter
for a valid UK telphone number. It returns false for an invalid number and the
reformatted telephone number false a valid number.

If false is returned, the global variable telNumberError contains an error
number, which may be used to index into the array of error descriptions 
contained in the global array telNumberErrors.

The definition of a valid telephone number has been taken from:

http://www.ofcom.org.uk/telecoms/ioi/numbers/numplan030809.pdf

All inappropriate telephone numbers are disallowed (e.g. premium lines, sex 
lines, radio-paging services etc.)

Author:    John Gardner
Date:      16th November 2003

Version:   V1.1  4th August 2006       
					 Updated to include 03 numbers being added by Ofcom in early 2007.

Version:   V1.2  9th January 2007
           Isle of Man mobile numbers catered for 

Version:   V1.3  6th November 2007
           Support for mobile numbers improved - thanks to Natham Lisgo

Version:   V1.4  14th April 2008
           Numbers allocated for drama excluded - thanks to David Legg
			
Example calling sequnce:

  if (!checkUKTelephone (myTelNo)) {
     alert (telNumberErrors[telNumberErrorNo]);
  }

------------------------------------------------------------------------------*/

function checkUKTelephone (telephoneNumber) {

  // Convert into a string and check that we were provided with something
  var telnum = telephoneNumber + " ";
  if (telnum.length == 1)  {
     telNumberErrorNo = 1;
     return false
  }
  telnum.length = telnum.length - 1;
  
  // Don't allow country codes to be included (assumes a leading "+")
  var exp = /^(\+)[\s]*(.*)$/;
  if (exp.test(telnum) == true) {
     telNumberErrorNo = 2;
     return false;
  }
  
  // Remove spaces from the telephone number to help validation
  while (telnum.indexOf(" ")!= -1)  {
    telnum = telnum.slice (0,telnum.indexOf(" ")) + telnum.slice (telnum.indexOf(" ")+1)
  }
  
  // Remove hyphens from the telephone number to help validation
  while (telnum.indexOf("-")!= -1)  {
    telnum = telnum.slice (0,telnum.indexOf("-")) + telnum.slice (telnum.indexOf("-")+1)
  }  
  
  // Now check that all the characters are digits
  exp = /^[0-9]{10,11}$/;
  if (exp.test(telnum) != true) {
     telNumberErrorNo = 3;
     return false;
  }
  
  // Now check that the first digit is 0
  exp = /^0[0-9]{9,10}$/;
  if (exp.test(telnum) != true) {
     telNumberErrorNo = 4;
     return false;
  }
	
	// Disallow numbers allocated for dramas.
	 
  // Array holds the regular expressions for the drama telephone numbers
  var tnexp = new Array ();
	tnexp.push (/^(0113|0114|0115|0116|0117|0118|0121|0131|0141|0151|0161)(4960)[0-9]{3}$/);
	tnexp.push (/^02079460[0-9]{3}$/);
	tnexp.push (/^01914980[0-9]{3}$/);
	tnexp.push (/^02890180[0-9]{3}$/);
	tnexp.push (/^02920180[0-9]{3}$/);
	tnexp.push (/^01632960[0-9]{3}$/);
	tnexp.push (/^07700900[0-9]{3}$/);
	tnexp.push (/^08081570[0-9]{3}$/);
	tnexp.push (/^09098790[0-9]{3}$/);
	tnexp.push (/^03069990[0-9]{3}$/);
	
	for (var i=0; i<tnexp.length; i++) {
    if ( tnexp[i].test(telnum) ) {
      telNumberErrorNo = 5;
      return false;
    }
	}
  
  // Finally check that the telephone number is appropriate.
  exp = (/^(01|02|03|05|070|071|072|073|074|075|07624|077|078|079)[0-9]+$/);
	if (exp.test(telnum) != true) {
     telNumberErrorNo = 5;
     return false;
  }
  
  // Telephone number seems to be valid - return the stripped telehone number  
  return telnum;
}
var telNumberErrorNo = 0;
var telNumberErrors = new Array ();
telNumberErrors[0] = "Valid UK telephone number";
telNumberErrors[1] = "Telephone number not provided";
telNumberErrors[2] = "UK telephone number without the country code, please";
telNumberErrors[3] = "UK telephone numbers should contain 10 or 11 digits";
telNumberErrors[4] = "The telephone number should start with a 0";
telNumberErrors[5] = "The telephone number is either invalid or inappropriate";