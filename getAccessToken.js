const axios = require('axios');
const FormData = require('form-data');

module.exports = async function getAccessToken() {
  try {
    const data = new FormData();
    data.append('client_id', '1000.YH35WONEKRPSK3RBWQHHZ7CHFE89NI');
    data.append('client_secret', '92189c5255377f6430a8318c9c960103a2b24bf511');
    data.append('refresh_token', '1000.ca3b9caedf843b215c77f01259a17eed.81c44324e61851fe3fcb3c45831512a9');
    data.append('grant_type', 'refresh_token');

    const response = await axios.post('https://accounts.zoho.eu/oauth/v2/token', data, {
      headers: data.getHeaders(),
    });

    const accessToken = response.data.access_token;
    if (!accessToken) throw new Error("No access token returned from Zoho.");

    console.log("✅ Zoho Access Token fetched successfully.");
    return accessToken;

  } catch (error) {
    console.error("❌ Failed to fetch access token:", error.message);
    throw error;
  }
};
