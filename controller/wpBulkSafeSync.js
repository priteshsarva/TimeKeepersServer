// controller/wpBulkSafeSync.js
import fetch from "node-fetch";
import "dotenv/config";
import { DB } from "../connect.js";
import { log } from "console";
import { brandMap } from "./updateProductCategoryAndBrand.js";

const WP_URL = process.env.WP_URL;
const WP_CONSUMER_KEY = process.env.WP_CONSUMER_KEY;
const WP_CONSUMER_SECRET = process.env.WP_CONSUMER_SECRET;

function getAuthHeader() {
  // const auth = Buffer.from(`${WP_CONSUMER_KEY}:${WP_CONSUMER_SECRET}`).toString("base64");
  // return `Basic ${auth}`;

  const username = process.env.WP_USER; // <-- add this to your .env
  const appPassword = process.env.WP_APP_PASSWORD; // <-- add this to your .env
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}

function getAuthHeadertocreactbrand() {
  const username = process.env.WP_USER; // <-- add this to your .env
  const appPassword = process.env.WP_APP_PASSWORD; // <-- add this to your .env
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}


// ---------------- CATEGORY HELPERS ----------------
async function getCategoryByName(name) {
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products/categories?search=${encodeURIComponent(name)}`, {
      headers: { Authorization: getAuthHeader() },
    });
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ Error fetching category:", err);
    return null;
  }
}

async function createCategory(name) {
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products/categories`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Category created: ${name} (ID: ${data.id})`);
      return data;
    } else {
      console.error("❌ Error creating category:", data);
      return null;
    }
  } catch (err) {
    console.error("❌ Unexpected error creating category:", err);
    return null;
  }
}

async function getOrCreateCategory(name) {
  if (!name) return null;
  let category = await getCategoryByName(name);
  if (!category) category = await createCategory(name);
  return category?.id || null;
}

// ---------------- PRODUCT HELPERS ----------------
async function getProductBySKU(sku) {
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/products?sku=${sku}`, {
      headers: { Authorization: getAuthHeader() },
    });

    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`❌ WooCommerce did not return JSON for SKU ${sku}`);
      const text = await res.text();
      console.error("Response HTML:", text.slice(0, 300)); // log first 300 chars
      return null;
    }

    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ Error checking product:", err);
    return null;
  }
}


// async function upsertProductSafe(product) {
//   try {
//     const sku = product.productId?.toString();
//     if (!sku) {
//       console.warn(`⚠️ Skipping product — missing productId: ${product.productName}`);
//       return;
//     }

//     const existing = await getProductBySKU(sku);
//     let method = "POST";
//     let endpoint = `${WP_URL}/wp-json/wc/v3/products`;

//     if (existing) {
//       endpoint = `${WP_URL}/wp-json/wc/v3/products/${existing.id}`;
//       method = "PUT";
//       console.log(`ℹ️ Updating product ID ${existing.id}`);
//     } else {
//       console.log(`🆕 Creating new product: ${product.productName}`);
//     }

//     const categoryId = await getOrCreateCategory(product.catName);

//     let images = [];
//     try {
//       const imgs = JSON.parse(product.imageUrl);
//       images = imgs.map((src) => ({ src }));
//     } catch {
//       if (product.featuredimg) images.push({ src: product.featuredimg });
//     }

//     const regularPrice = ((product.productOriginalPrice || 0) + 1200).toString();

//     const payload = {
//       name: product.productName,
//       type: "simple",
//       regular_price: regularPrice,
//       sku,
//       description: product.productDescription || "",
//       short_description: product.productShortDescription || "",
//       categories: categoryId ? [{ id: categoryId }] : [],
//       meta_data: [
//         { key: "productFetchedFrom", value: product.productFetchedFrom },
//         { key: "videoUrl", value: product.videoUrl || "" },
//         { key: "availability", value: product.availability ? "instock" : "outofstock" },
//         { key: "productOriginalPrice", value: product.productOriginalPrice },
//         { key: "featuredimg", value: product.featuredimg },
//         { key: "imageUrl", value: product.imageUrl },
//         { key: "productBrand", value: product.productBrand },
//         { key: "productLastUpdated", value: product.productLastUpdated },
//         { key: "productDateCreation", value: product.productDateCreation},
//         { key: "productShortDescription", value: product.productShortDescription},
//         { key: "productDescription", value: product.productDescription},
//       ],
//       stock_status: product.availability ? "instock" : "outofstock",
//     };

//     // 🚫 Skip image reupload if updating
//     if (!existing) {
//       payload.images = images;
//     }

//     const res = await fetch(endpoint, {
//       method,
//       headers: {
//         Authorization: getAuthHeader(),
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await res.json();
//     if (res.ok) {
//       console.log(`✅ ${existing ? "Updated" : "Created"}: ${data.name} (ID: ${data.id})`);
//     } else {
//       console.error("❌ Error creating/updating product:", data);
//     }
//   } catch (err) {
//     console.error("❌ Unexpected error:", err);
//   }
// }





async function getOrCreateBrand(brandName) {
  if (!brandName) return null;

  try {
    const searchUrl = `${WP_URL}/wp-json/wp/v2/product_brand?search=${encodeURIComponent(brandName)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: getAuthHeader() },
    });
    const existing = await searchRes.json();

    if (existing.length > 0) {
      console.log(`🏷️ Found existing brand: ${existing[0].name} (ID: ${existing[0].id})`);
      return existing[0].id;
    }

    // Create new brand if not found
    const createRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand`, {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: brandName }),
    });

    const newBrand = await createRes.json();

    if (createRes.ok) {
      console.log(`🆕 Created new brand: ${newBrand.name} (ID: ${newBrand.id})`);
      return newBrand.id;
    } else {
      console.error("❌ Error creating brand:", newBrand);
      return null;
    }
  } catch (err) {
    console.error("❌ Brand lookup/creation failed:", err);
    return null;
  }
}

export async function upsertProductSafe(product, productId = null) {


  try {
    const sku = (productId ?? product.productId)?.toString()
    if (!sku) {
      console.warn(`⚠️ Skipping product — missing productId: ${product.productName}`);
    }

    // const existing = await getProductBySKU(sku);

    // Use passed productId if available, otherwise look up by SKU
    let existing = null;
    existing = await getProductBySKU(sku);

    // if (!productId) {
    //   existing = await getProductBySKU(sku); 
    //   if (existing) productId = existing.id;
    // } else {
    //   existing = { id: productId };
    // }

    let method = "POST";
    let endpoint = `${WP_URL}/wp-json/wc/v3/products`;

    if (existing) {
      endpoint = `${WP_URL}/wp-json/wc/v3/products/${existing.id}`;
      method = "PUT";
      console.log(`ℹ️ Updating product ID ${existing.id}`);
    } else {
      console.log(`🆕 Creating new product: ${product.productName}`);
    }

    const categoryId = !existing ? await getOrCreateCategory(product.catName) : null;
    // const brandId = !existing ? await getOrCreateBrand(product.productBrand) : null;  //use while creating new
    // const brandId = existing ? await getOrCreateBrand(product.productBrand) : null;  //used while i was doing bulk update
    const brandId = await getOrCreateBrand(product.productBrand);  //used while i was doing bulk update from devupdate

    let images = [];
    try {
      const imgs = JSON.parse(product.imageUrl);
      images = imgs.map((src) => ({ src }));
    } catch {
      if (product.featuredimg) images.push({ src: product.featuredimg });
    }

    const regularPrice = ((Number(product.productOriginalPrice) || 0) + 1200).toString()
    const stock_status = (product.availability === 1 || product.availability === true)
      ? "instock"
      : "outofstock";

    // ✅ Base payload
    const payload = {
      name: product.productName,
      type: "simple",
      regular_price: regularPrice,
      sku,
      description: product.productDescription || "",
      short_description: product.productShortDescription || "",
      stock_status,
      brands: [{ id: brandId }], // for temp
      meta_data: [
        { key: "productFetchedFrom", value: product.productFetchedFrom },
        { key: "productUrl", value: product.productUrl },
        { key: "availability", value: product.availability },
        { key: "productOriginalPrice", value: product.productOriginalPrice },
        { key: "featuredimg", value: product.featuredimg.replace("gallery_sm", "gallery_md") },

        // { key: "videoUrl", value: product.videoUrl || "" },  //add just for bulkupdated from server maually
        // { key: "imageUrl", value: product.imageUrl }, //add just for bulkupdated from server maually

        // check it later dont miss this make this for videoUrl also
        // {
        //   key: "imageUrl", value: product.imageUrl || (existing.meta_data?.find(m => m.key === "imageUrl")?.value || "")
        // },
        // {
        //   key: "videoUrl", value: product.videoUrl || (existing.meta_data?.find(m => m.key === "videoUrl")?.value || "")
        // },


        { key: "productBrand", value: product.productBrand },
        { key: "productLastUpdated", value: product.productLastUpdated || Date.now() },
        { key: "productShortDescription", value: product.productShortDescription },
        { key: "productDescription", value: product.productDescription },
      ],
    };


    // ✅ Add price, category & brand only for new products
    if (!existing) {
      payload.regular_price = regularPrice;
      payload.sku,
        payload.meta_data.push({
          key: "productDateCreation",
          value: Date.now(),
        });
      payload.meta_data.push({
        key: "productOriginalPrice",
        value: product.productOriginalPrice,
      });
      payload.meta_data.push({
        key: "imageUrl",
        value: product.imageUrl.replace("gallery_sm", "gallery_md"),
      });

      payload.meta_data.push({
        key: "videoUrl",
        value: product.videoUrl || "",
      });

      if (categoryId) payload.categories = [{ id: categoryId }];

      // Directly assign the brand for new products
      if (brandId) payload.brands = [{ id: brandId }];

      // payload.images = images;
    }


    const res = await fetch(endpoint, {
      method,
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ ${existing ? "Updated" : "Created"}: ${data.name} (ID: ${data.id})`);
    } else {
      console.error("❌ Error creating/updating product:", data);
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}



// ---------------- BULK SYNC ----------------
export async function bulkSafeSyncProducts(req, res) {
  console.log("🔄 Starting bulk sync (safe mode) from local DB → WooCommerce...");

  try {


    const rows = await new Promise((resolve, reject) => {
      const currentTimestamp = Date.now(); // Current timestamp in milliseconds
      // const oneDayAgo = currentTimestamp - 100 * 60 * 60 * 1000; // 24 hours ago in milliseconds
      const twelveAndHalfHoursAgo = currentTimestamp - 1000 * 60 * 60 * 1000; // 12.5 hours ago in milliseconds


      DB.all(
        "SELECT * FROM PRODUCTS WHERE productLastUpdated >= ? ORDER BY datetime(productLastUpdated / 1000, 'unixepoch') DESC;",
        // [oneDayAgo],
        [twelveAndHalfHoursAgo],
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    console.log(`📦 Found ${rows.length} products to sync.`);

    const batchSize = 5;
    const delayMs = 250;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      console.log(`🚀 Syncing batch ${i / batchSize + 1} (${batch.length} products)...`);

      await Promise.all(batch.map((p) => upsertProductSafe(p)));
      console.log(`✅ Batch ${i / batchSize + 1} complete. Waiting ${delayMs}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    console.log("🎉 Bulk safe sync complete!");
    res.send({ status: "success", message: "Bulk safe sync complete" });
  } catch (err) {
    console.error("❌ DB error:", err);
    res.status(500).send({ error: err.message });
  }
}





// ---------------- FIX BRAND HIERARCHY USING brandMap ----------------
export async function fixBrandsFromMap() {
  console.log("🔄 Fixing brands hierarchy from brandMap...");

  try {
    for (const [parentName, subbrands] of Object.entries(brandMap)) {
      let parentId = null;

      // 1️⃣ Ensure parent brand exists
      const parentSearchRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand?search=${encodeURIComponent(parentName)}`, {
        headers: { Authorization: getAuthHeader() },
      });
      const parentData = await parentSearchRes.json();

      parentId = parentData.find(b => b.name.toLowerCase() === parentName.toLowerCase())?.id || null;

      if (!parentId) {
        const createParentRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand`, {
          method: "POST",
          headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: parentName }),
        });
        const parent = await createParentRes.json();
        if (createParentRes.ok) {
          parentId = parent.id;
          console.log(`🆕 Created parent brand: ${parentName} (ID: ${parentId})`);
        } else {
          console.error("❌ Failed to create parent brand:", parent);
          continue;
        }
      } else {
        console.log(`✅ Parent brand exists: ${parentName} (ID: ${parentId})`);
      }

      // 2️⃣ Loop through subbrands
      for (const subName of subbrands) {
        try {
          const subSearchRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand?search=${encodeURIComponent(subName)}`, {
            headers: { Authorization: getAuthHeader() },
          });
          const subData = await subSearchRes.json();

          // Find exact match
          const exactSub = subData.find(b => b.name.toLowerCase() === subName.toLowerCase());

          if (exactSub) {
            // Force update parent
            const updateRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand/${exactSub.id}`, {
              method: "PUT",
              headers: {
                Authorization: getAuthHeader(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ parent: parentId }),
            });
            const updated = await updateRes.json();
            if (updateRes.ok) console.log(`🔄 Updated parent for subbrand '${subName}' → '${parentName}'`);
            else console.error("❌ Failed to update subbrand parent:", updated);
          } else {
            // Create subbrand under parent
            const createSubRes = await fetch(`${WP_URL}/wp-json/wp/v2/product_brand`, {
              method: "POST",
              headers: {
                Authorization: getAuthHeader(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name: subName, parent: parentId }),
            });
            const newSub = await createSubRes.json();
            if (createSubRes.ok) console.log(`🆕 Created subbrand '${subName}' under '${parentName}'`);
            else console.error("❌ Failed to create subbrand:", newSub);
          }
        } catch (err) {
          console.error(`❌ Error processing subbrand '${subName}':`, err);
        }
      }
    }

    console.log("🎉 Brand hierarchy updated successfully!");
  } catch (err) {
    console.error("❌ Error fixing brands from brandMap:", err);
  }
}



