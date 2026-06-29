const Complaint = require("../models/complaintModel");
const db = require("../db");

async function generateReference(id) {
  await db.query(
    `
UPDATE complaints
SET reference_number=$1
WHERE id=$2
`,
    [`NTG${id}`, id],
  );
}

exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD CUSTOMER COMPLAINT BODY:",
      JSON.stringify(req.body, null, 2),
    );

    const complaint = await Complaint.createComplaint(req.body);

    await generateReference(complaint.id);

    // FIX
    const data = await Complaint.getComplaintById(complaint.id);

    return res.status(201).json({
      status: true,
      complaint: data,
    });
  } catch (err) {
    console.error("ADD COMPLAINT ERROR:", err);

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getAll = async (req, res) => {
  const offset = Number(req.query.offset) || 0;

  const limit = Number(req.query.limit) || 100;

  const complaints = await Complaint.getAllComplaints(offset, limit);

  res.json({
    status: true,
    count: complaints.length,
    complaints,
  });
};

exports.getById = async (req, res) => {
  const data = await Complaint.getComplaintById(req.query.id);

  res.json({
    status: true,
    complaint: data,
  });
};

exports.update = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING UPDATE COMPLAINT BODY:",
      JSON.stringify(req.body, null, 2)
    );

    const updated =
      await Complaint.updateComplaint(
        req.params.id,
        req.body
      );

    if (!updated) {
      return res.status(404).json({
        status: false,
        message: "Complaint not found",
      });
    }

    // Create jaisa response
    const data =
      await Complaint.getComplaintById(
        updated.id
      );

    return res.json({
      status: true,
      complaint: data,
    });

  } catch (err) {
    console.error("UPDATE ERROR:", err);

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted =
      await Complaint.deleteComplaint(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "Complaint Not Found",
      });
    }

    return res.json({
      status: true,
      message: "Complaint Deleted Successfully",
    });

  } catch (err) {
    console.error("DELETE COMPLAINT ERROR:", err);

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
