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

    if (files.banner) updateFields.banner = files.banner[0].location;
    if (files.headerLogo)
      updateFields.headerLogo = files.headerLogo[0].location;
    if (files.footerLogo)
      updateFields.footerLogo = files.footerLogo[0].location;
    if (files.favicon) updateFields.favicon = files.favicon[0].location;
    if (files.loader) updateFields.loader = files.loader[0].location;
    if (files.signatory) updateFields.signatory = files.signatory[0].location;

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
      "isActive",
    ];

    basicFields.forEach((field) => {
      if (typeof body[field] !== "undefined") {
        updateFields[field] = body[field];
      }
    });

    if (body.headerLinks) updateFields.headerLinks = body.headerLinks;
    if (body.footerLinks) updateFields.footerLinks = body.footerLinks;
    if (body.walletTopupAmounts)
      updateFields.walletTopupAmounts = body.walletTopupAmounts;
    if (Array.isArray(body.onboardingScreens)) {
      updateFields.onboardingScreens = body.onboardingScreens;
    }

    if (body.socialMedia) {
      Object.keys(body.socialMedia).forEach((key) => {
        updateFields[`socialMedia.${key}`] = body.socialMedia[key];
      });
    }

    if (body.seo) {
      Object.keys(body.seo).forEach((key) => {
        updateFields[`seo.${key}`] = body.seo[key];
      });
    }

    if (body.policy) {
      Object.keys(body.policy).forEach((key) => {
        updateFields[`policy.${key}`] = body.policy[key];
      });
    }

    if (body.theme) {
      Object.keys(body.theme).forEach((key) => {
        updateFields[`theme.${key}`] = body.theme[key];
      });
    }

    if (body.delivery) {
      Object.keys(body.delivery).forEach((key) => {
        updateFields[`delivery.${key}`] = body.delivery[key];
      });
    }

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: company._id },
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: updatedCompany,
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
      status: "success",
      message: "Company retrieved successfully",
      results: 1,
      data: { company },
    };
    res.json(result);
  } catch (error) {
    next(error);
  }
};

import Pcategory from "../../models/category/pcategory.model.js";
import Category from "../../models/category/category.model.js";
import Brand from "../../models/vendorShop/brand.model.js";
import User from "../../models/user/user.model.js";
import Order from "../../models/marketPlace/order.model.js";
import City from "../../models/admin/city.model.js";
import { VendorProfile } from "../../models/vendorShop/vendor.model.js";
import Product from "../../models/vendorShop/product.model.js";
// controllers/dashboardController.js
// export const getLandingPage = async (req, res, next) => {
//   try {
//     // 1. Company data
//     let company = await Company.findOne();
//     if (!company) {
//       company = await Company.create({});
//     }

//     // 2. Pcategory (Parent Categories) - sirf name aur image
//     const pcategories = await Pcategory.find({ isActive: true })
//       .select("name image")
//       .sort({ order: 1 }) // agar order field hai toh
//       .lean();

//     const formattedPcategories = pcategories.map((pcat) => ({
//       id: pcat._id,
//       name: pcat.name,
//       img: pcat.image,
//     }));

//     // 3. Category (Sub Categories) - sirf name aur image
//     const categories = await Category.find({ isActive: true })
//       .select("name image")
//       .sort({ name: 1 })
//       .lean();

//     const formattedCategories = categories.map((cat) => ({
//       id: cat._id,
//       name: cat.name,
//       img: cat.image,
//     }));

//     // 4. Brands
//     const brands = await Brand.find().select("name logo").limit(20).lean();

//     const formattedBrands = brands.map((brand) => ({
//       id: brand._id,
//       name: brand.name,
//       img: brand.logo,
//     }));

//     // 5. Stats
//     const [
//       totalVerifiedVendors,
//       totalUsers,
//       totalOrders,
//       totalCities,
//       totalPcategories,
//       totalCategories,
//       totalBrands,
//     ] = await Promise.all([
//       VendorProfile.countDocuments({ isAdminVerified: true }),
//       User.countDocuments({ role: "USER" }),
//       Order.countDocuments(),
//       City.countDocuments(),
//       Pcategory.countDocuments({ isActive: true }),
//       Category.countDocuments({ isActive: true }),
//       Brand.countDocuments(),
//     ]);

//     // 6. Recent products
//     const recentProducts = await Product.find({ varified: true })
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .lean();

//     const formattedProducts = recentProducts.map((product) => ({
//       productId: product._id,
//       name: product.name,
//       image: product.images?.[0] || "",
//       createdAt: product.createdAt,
//     }));

//     // 7. Company contact details
//     const companyContact = {
//       email: company.email,
//       phone: company.phone,
//       alternatePhone: company.alternatePhone,
//       officeAddress: company.address,
//       whatsapp: company.socialMedia?.whatsapp || company.phone,
//       gstNumber: company.gstNumber,
//     };

//     // 8. App store links
//     const appLinks = {
//       appStore: company.appStoreLink,
//       playStore: company.playStoreLink,
//     };

//     const socialMedia = company.socialMedia || {};

//     const result = {
//       status: "success",
//       message: "Landing page data retrieved successfully",
//       data: {
//         // Company info
//         company: {
//           name: company.siteName,
//           tagline: company.description,
//           title: company.siteName,
//           paragraph: company.description,
//           ...companyContact,
//           socialMedia,
//           appLinks,
//           banner: company.banner,
//           headerLogo: company.headerLogo,
//           footerLogo: company.footerLogo,
//         },

//         pcategories: formattedPcategories,

//         categories: formattedCategories,

//         brands: formattedBrands,

//         // Stats
//         stats: {
//           totalVerifiedVendors,
//           totalUsers,
//           totalOrders,
//           totalCities,
//           totalPcategories,
//           totalCategories,
//           totalBrands,
//         },

//         recentProducts: formattedProducts,
//       },
//     };

//     res.json(result);
//   } catch (error) {
//     console.error("Error in getLandingPage:", error);
//     next(error);
//   }
// };

export const getLandingPage = async (req, res, next) => {
  try {
    // ─── Run ALL independent queries in parallel ───────────────────────────
    const [
      company,
      pcategories,
      categories,
      brands,
      recentProducts,
      totalVerifiedVendors,
      totalUsers,
      totalOrders,
      totalCities,
      totalPcategories,
      totalCategories,
      totalBrands,
    ] = await Promise.all([
      // Company (upsert in background if missing — see note below)
      Company.findOne().lean(),

      // Parent Categories
      Pcategory.find({ isActive: true })
        .select("name image")
        .sort({ order: 1 })
        .lean(),

      // Sub Categories
      Category.find({ isActive: true })
        .select("name image")
        .sort({ name: 1 })
        .lean(),

      // Brands
      Brand.find().select("name logo").limit(20).lean(),

      // Recent Products
      Product.find({ varified: true })
        .select("name images createdAt") // ← only needed fields
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Stats — already parallel, keep them here
      VendorProfile.countDocuments({ isAdminVerified: true }),
      User.countDocuments({ role: "USER" }),
      Order.countDocuments(),
      City.countDocuments(),
      Pcategory.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Brand.countDocuments(),
    ]);

    // ─── Handle missing company (rare) without blocking response ──────────
    const resolvedCompany = company ?? (await Company.create({}));

    // ─── Shape data (pure CPU — zero DB cost) ─────────────────────────────
    const socialMedia = resolvedCompany.socialMedia ?? {};

    const result = {
      status: "success",
      message: "Landing page data retrieved successfully",
      data: {
        company: {
          name: resolvedCompany.siteName,
          tagline: resolvedCompany.description,
          title: resolvedCompany.siteName,
          paragraph: resolvedCompany.description,
          email: resolvedCompany.email,
          phone: resolvedCompany.phone,
          alternatePhone: resolvedCompany.alternatePhone,
          officeAddress: resolvedCompany.address,
          whatsapp: socialMedia.whatsapp ?? resolvedCompany.phone,
          gstNumber: resolvedCompany.gstNumber,
          socialMedia,
          appLinks: {
            appStore: resolvedCompany.appStoreLink,
            playStore: resolvedCompany.playStoreLink,
          },
          banner: resolvedCompany.banner,
          headerLogo: resolvedCompany.headerLogo,
          footerLogo: resolvedCompany.footerLogo,
          policy: resolvedCompany.policy,
        },

        pcategories: pcategories.map(({ _id, name, image }) => ({
          id: _id,
          name,
          img: image,
        })),

        categories: categories.map(({ _id, name, image }) => ({
          id: _id,
          name,
          img: image,
        })),

        brands: brands.map(({ _id, name, logo }) => ({
          id: _id,
          name,
          img: logo,
        })),

        stats: {
          totalVerifiedVendors,
          totalUsers,
          totalOrders,
          totalCities,
          totalPcategories,
          totalCategories,
          totalBrands,
        },

        recentProducts: recentProducts.map(
          ({ _id, name, images, createdAt }) => ({
            productId: _id,
            name,
            image: images?.[0] ?? "",
            createdAt,
          }),
        ),
      },
    };

    res.json(result);
  } catch (error) {
    // console.error("Error in getLandingPage:", error);
    next(error);
  }
};
