const SettingsModel = require("../models/driverSinbinModelsettingsModel");
const SinbinModel = require("../models/driverSinbinModel");

class SinbinService {
  /**
   * Driver ko event ke basis par automatically Sin Bin me dalna
   * @param {number} company_id 
   * @param {number} driver_id 
   * @param {'MISSED' | 'REJECT'} triggerType 
   */
  static async checkAndApplySinbin(company_id, driver_id, triggerType) {
    try {
      // 1. Company ki settings fetch karein
      const settings = await SettingsModel.getByCompanyId(company_id);
      if (!settings) return;

      let timerMinutes = 0;
      let message = "";

      // 2. Trigger check karein
      if (triggerType === "MISSED") {
        timerMinutes = parseInt(settings.ignorejob) || 0;
        message = `Auto Sin-Bin: You missed/ignored an assigned job. Placed on hold for ${timerMinutes} minute(s).`;
      } else if (triggerType === "REJECT") {
        timerMinutes = parseInt(settings.rejectjob) || 0;
        message = `Auto Sin-Bin: You rejected an assigned job. Placed on hold for ${timerMinutes} minute(s).`;
      }

      // 3. Agar timer > 0 hai tabhi Sin Bin me dalei
      if (timerMinutes > 0) {
        await SinbinModel.updateDriverSinbin(company_id, {
          driver_id,
          message,
          sinbin_time: timerMinutes,
          is_active: true
        });

        console.log(`✅ Driver ${driver_id} added to Sin-Bin via ${triggerType} for ${timerMinutes} mins.`);
      }
    } catch (error) {
      console.error(`❌ Error in Auto Sin-Bin (${triggerType}):`, error.message);
    }
  }
}

module.exports = SinbinService;