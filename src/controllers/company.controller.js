import companyModel from "../models/company.model.js";

export const getCompany = async (req, res, next) => {
  try {
    let company = await companyModel.findOne();
    if (!company) {
      company = await companyModel.create({
        companyName: "E-Commerce-Make-Up",
        companyAddress: "",
        contactNumber: "",
        whatsappNumber: "",
        aboutUs: "",
        termsAndConditon: "",
        privatePolicy: "",
        logo: "",
        supportEmail: "",
        map: { lang, long },
        loader: "",
        fav_icon: "", 
        refund_Policy: "<h1>refund_Policy</h1>",
        return_policy: "<h1>return_policy </h1>",
        gst: "23BGJPG17838",  
        
      });
    }

    res.json({
      status: "success",
      message: "Company fatched successfully",
      data: { company },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    let updateData = { ...req.body };
    const updateFeilds = [
      "companyName",
      "companyAddress",
      "contactNumber",
      "whatsappNumber",
      "aboutUs",
      "termsAndConditon",
      "privatePolicy",
      "supportEmail",
       "email",
      "logo",
      "facebook",
      "googleMyBusiness",
      "pinterest",
      "instagram",
      "linkedin",
      "twitter",
      "map",
      "loader",
      "fav_icon",
      "refund_Policy",
      "return_policy",
      "gst"
    ];

    updateFeilds.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.files) {
      if (req.files.logo) {
        updateData.logo = req.files.logo[0].key || req.files.logo[0].location;
      }
    }

    const updatedCompany = await companyModel.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
    });
    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: updatedCompany,
    });
  } catch (error) {
    next(error);
  }
};
