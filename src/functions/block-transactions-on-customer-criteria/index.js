const FoxyWebhook = require("../../foxy/FoxyWebhook.js");
const MatchList = require("./matchlist.json");

/**
 * Receives the request, processes it and sends the response.
 *
 * @param {Object} requestEvent the request event built by Netlify Functions
 * @returns {Promise<{statusCode: number, body: string}>} the response object
 */

async function handler(requestEvent) {
  const customerEmail = extractCustomerEmail(requestEvent.body);
  const customerIP = extractCustomerIP(requestEvent.body);

  if (getEmailList().includes(customerEmail) || getIPAddressList().includes(customerIP) || checkCustomerNames(requestEvent.body)) {
    return {
      body: JSON.stringify({ details: "Sorry, the transaction cannot be completed.", ok: false }),
      statusCode: 200,
    }
  }
  return {
    body: JSON.stringify({ details: "", ok: true }),
    statusCode: 200,
  }
}

/**
 * Extract Customer Email from payload received from FoxyCart
 *
 * @param {string} body of the data received from payload
 * @returns {string} email address of transaction
 */
function extractCustomerEmail(body) {
  const objBody = JSON.parse(body);
  if (objBody && objBody._embedded && objBody._embedded['fx:customer']['email']) {
    return objBody._embedded['fx:customer']['email'];
  }
  return "";
}

/**
 * Extract Customer IP Address from payload received from FoxyCart
 *
 * @param {string} body of the data received from payload
 * @returns {string} ip address of transaction
 */
 function extractCustomerIP(body) {
  const objBody = JSON.parse(body);
  if (objBody && objBody['customer_ip']) {
    return objBody['customer_ip'];
  }
  return "";
}

/**
 * Extract Customer Name from payload received from FoxyCart
 *
 * @param {string} body of the data received from payload
 * @param {string} address_object the embedded object to get the name from
 * @returns {string} full customer name
 */
function extractCustomerName(body, address_object = "fx:customer") {
  const objBody = JSON.parse(body);
  let customer_name = "";
  if (objBody?._embedded?.[address_object]?.['first_name']) {
    customer_name += objBody._embedded[address_object]['first_name'];
  }
  if (objBody?._embedded?.[address_object]?.['last_name']) {
    customer_name += " " + objBody._embedded[address_object]['last_name'];
  }
  return customer_name.trim().toLowerCase();
}

/**
 * Opens file and returns list of emails
 *
 * @param {Object} email to be validated
 * @returns {array} array of email addresses
 */

function getEmailList() {
  const emailsToReject = MatchList["email_addresses"];
  if (emailsToReject) {
    return emailsToReject;
  }
  return [];
}

/**
 * Opens file and returns IP Addresses to block
 *
 * @param {Object} IP Addresses to be validated
 * @returns {array} array of IP Addresses
 */

 function getIPAddressList() {
  const ipsToReject = MatchList["ip_addresses"];
  if (ipsToReject) {
    return ipsToReject;
  }
  return [];
}

/**
 * Check if any customer names from payload received from FoxyCart are in the block list
 *
 * @param {string} body of the data received from payload
 * @returns {boolean} true if a customer name from the match list is found in the transaction
 */
function checkCustomerNames(body) {
  const namesToReject = MatchList["customer_names"] || [];
  const customer_names = [extractCustomerName(body, 'fx:customer'), extractCustomerName(body, 'fx:shipment')];

  return namesToReject.some((name) => { return (name != "" && customer_names.includes(name.toLowerCase())); });
}

module.exports = {
  handler
}
