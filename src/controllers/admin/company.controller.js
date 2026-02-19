import Company from "../../models/admin/company.model.js";

export const updateCompany = async (req, res, next) => {
  try {

    const files = req.files || {};
    const body = req.body;


    // Ensure company exists
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({});
    }

    const updateFields = {};


    if (files.banner) updateFields.banner = files.banner[0].key;
    if (files.headerLogo) updateFields.headerLogo = files.headerLogo[0].key;
    if (files.footerLogo) updateFields.footerLogo = files.footerLogo[0].key;
    if (files.favicon) updateFields.favicon = files.favicon[0].key;
    if (files.loader) updateFields.loader = files.loader[0].key;
    if (files.signatory) updateFields.signatory = files.signatory[0].key;


    const basicFields = [
      "siteName",
      "description",
      "email",
      "phone",
      "alternatePhone",
      "address",
      "gstNumber",
      "playStoreLink",
      "appStoreLink",
      "isActive"
    ];

    basicFields.forEach(field => {
      if (typeof body[field] !== "undefined") {
        updateFields[field] = body[field];
      }
    });


    if (body.headerLinks) updateFields.headerLinks = body.headerLinks;
    if (body.footerLinks) updateFields.footerLinks = body.footerLinks;
    if (body.walletTopupAmounts) updateFields.walletTopupAmounts = body.walletTopupAmounts;
    if (Array.isArray(body.onboardingScreens)) {
      updateFields.onboardingScreens = body.onboardingScreens;
    }


    if (body.socialMedia) {
      Object.keys(body.socialMedia).forEach(key => {
        updateFields[`socialMedia.${key}`] = body.socialMedia[key];
      });
    }


    if (body.seo) {
      Object.keys(body.seo).forEach(key => {
        updateFields[`seo.${key}`] = body.seo[key];
      });
    }


    if (body.policy) {
      Object.keys(body.policy).forEach(key => {
        updateFields[`policy.${key}`] = body.policy[key];
      });
    }


    if (body.theme) {
      Object.keys(body.theme).forEach(key => {
        updateFields[`theme.${key}`] = body.theme[key];
      });
    }


    if (body.delivery) {
      Object.keys(body.delivery).forEach(key => {
        updateFields[`delivery.${key}`] = body.delivery[key];
      });
    }


    const updatedCompany = await Company.findOneAndUpdate(
      { _id: company._id },
      { $set: updateFields },
      {
        new: true,
        runValidators: true
      }
    );

    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: updatedCompany
    });

  } catch (error) {
    next(error);
  }
};


export const getCompany = async (req, res, next) => {
  try {

    let company = await Company.findOne();

    if (!company) {
      company = await Company.create({});
    }

    const result = {
      status: 'success',
      message: 'Company retrieved successfully',
      results: 1,
      data: { company }
    };
    res.json(result);

  } catch (error) {
    next(error);
  }
};