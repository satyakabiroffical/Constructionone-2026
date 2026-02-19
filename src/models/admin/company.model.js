import mongoose from "mongoose";

const onboardingItemSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    color: { type: String, default: "#ffffff" },
    image: { type: String, default: "" },
}, { _id: false });

const companySchema = new mongoose.Schema({

    siteName: { type: String, default: "My Company" },
    description: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    alternatePhone: { type: String, default: "" },
    address: { type: String, default: "" },
    gstNumber: { type: String, default: "" },

    banner: { type: String, default: "" },
    headerLogo: { type: String, default: "" },
    footerLogo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    loader: { type: String, default: "" },
    signatory: { type: String, default: "" },

    playStoreLink: { type: String, default: "" },
    appStoreLink: { type: String, default: "" },

    headerLinks: { type: [String], default: [] },
    footerLinks: { type: [String], default: [] },

    walletTopupAmounts: { type: [Number], default: [100, 200, 500, 1000] },

    onboardingScreens: {
        type: [onboardingItemSchema],
        default: []
    },

    isActive: { type: Boolean, default: true },

    socialMedia: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        twitter: { type: String, default: "" },
        youtube: { type: String, default: "" },
        whatsapp: { type: String, default: "" },
        pinterest: { type: String, default: "" },
        googleMyBusiness: { type: String, default: "" },
    },

    seo: {
        metaTitle: { type: String, default: "" },
        metaDescription: { type: String, default: "" },
        keywords: { type: [String], default: [] },
    },

    policy: {
        refundPolicy: { type: String, default: "" },
        shippingPolicy: { type: String, default: "" },
        returnPolicy: { type: String, default: "" },
        privacyPolicy: { type: String, default: "" },
        termsAndConditions: { type: String, default: "" },
    },

    theme: {
        primaryColor: { type: String, default: "#000000" },
        secondaryColor: { type: String, default: "#ffffff" },
        fontFamily: { type: String, default: "Arial" },
        borderRadius: { type: Number, default: 8 },
    },

    delivery: {
        productDeliveryFee: { type: Number, default: 0 },
        minDeliveryAmount: { type: Number, default: 0 },
        adminCharge: { type: Number, default: 0 },
    }

}, { timestamps: true });

export default mongoose.model("Company", companySchema);
