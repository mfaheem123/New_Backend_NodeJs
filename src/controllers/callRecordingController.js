const CallRecordingModel = require('../models/callRecordingModel');
const CompanyClientModel = require('../models/companyClientModel');

exports.handleWebhook = async (req, res) => {
  try {

    console.log(
      "🚀 INCOMING ADD CALL RECORDING BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Recording file missing in request' });
    }

    const { source, destination } = req.body;

    // Step 1: Pehle Source number (outbound) check karein, agar na mile to Destination (inbound) check karein
    let company = await CompanyClientModel.findCompanyByPhone(source);
    
    if (!company) {
      company = await CompanyClientModel.findCompanyByPhone(destination);
    }

    const companyId = company ? company.id : null;

    // Step 2: Recording details aur extracted company_id DB me save karein
    const payload = {
      ...req.body,
      company_id: companyId,
      file_path: req.file.path
    };

    const savedRecord = await CallRecordingModel.create(payload);

    return res.status(200).json({
      status: 'success',
      message: 'Call recording stored successfully',
      company_matched: company ? company.company_name : 'No matching active company found',
      data: savedRecord
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};