import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    date: Date,

    parentCategory: {
      id: String,
      name: String,
    },

    childCategory: {
      id: String,
      name: String,
    },

    productId: {
      type: String,
      unique: true,
    },

    productName: String,
    productCode: String,
    hsnCode: String,
    gst: Number,

    brand: String,
    color: String,
    colorTone: String,

    size: String,
    unit: String,
    netWeight: String,

    status: String,

    description: String,
    descriptionShort: String,

    saleType: String,
    stock: Number,

    mrpPrice: Number,
    mrpDiscount: Number,
    displayMRP: Number,

    imageUrl: String,
    images: [String],

    finishTexture: String,
    finishType: String,
    materialComposition: String,

    whereToUse: [String],
    styleFit: String,
    tags: [String],
    applications: [String],

    area: String,
    height: String,
    width: String,
    orientation: String,
  },
  { timestamps: true }
);

export default mongoose.model("ProductSequence", productSchema);