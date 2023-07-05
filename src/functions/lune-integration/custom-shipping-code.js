/* --- Config --- */
// API Key from Lune goes here
const LUNE_API_KEY = "";

// OAuth Foxy Integration info goes here
const foxyApi = new FoxySDK.Backend.API({
  clientId: "", //your client id
  clientSecret: "", //your client secret
  refreshToken: "", // your refresh token
});
// Weight units for the store ('lb' or 'kg')
const weightUnit = "lb";

// Shipping Origin Address and city for you store separated by a coma
const originAddress = "address goes here, city goes here";

// How to add the offset amount to the rates?
// If set to false: Add rates with the CO2 offset estimate amount included
// If set to true: Keep regular rates, and duplicate them to add them with the CO2 offset estimate amount included
const addOffsetRatesSeparately = true;

/* --- End Config --- */

const CALCULATE_EMISSIONS_PATH = "https://api.lune.co/v1/estimates/shipping";
const shipment = cart._embedded["fx:shipment"];
const shipmentResults = cart._embedded["fx:shipping_results"];
const addressArray = originAddress.split(",");

const addressFrom = {
  city: addressArray[1],
  country: countryCodeToISO3(shipment.origin_country),
  state: shipment.origin_region,
  street: addressArray[0],
  zip: shipment.origin_postal_code,
};

const totalWeight = getTotalWeightKg(shipment.total_weight);

const addressTo = {
  city: shipment.city,
  country: countryCodeToISO3(shipment.origin_country),
  state: shipment.region,
  street1: shipment.address1,
  zip: shipment.postal_code,
};

try {
  // Build shipment estimate request objects
  const shipmentInfo = shipmentResults.map((shippingResult) => {
    const { price, method, service_name, service_id } = shippingResult;
    const transportationMethod = getTransportationMethod(service_name);

    return {
      estimate_object: transportationMethod
        ? buildEstimateObject(
            addressFrom,
            addressTo,
            totalWeight,
            transportationMethod
          )
        : null,
      method,
      price,
      service_id,
      service_name,
    };
  });
  console.log("shipmentInfo", shipmentInfo);

  //Calculate Emissions for Each Shipping Rate
  const shippingResultsEmissions = [];
  const attributesRequestPayload = [];

  for (const shipmentResult of shipmentInfo) {
    const {
      service_id,
      estimate_object,
      service_name,
      price,
      method,
    } = shipmentResult;
    let estimate = {};

    // If not Free Shipping
    if (estimate_object) {
      const response = await fetch(CALCULATE_EMISSIONS_PATH, {
        body: JSON.stringify(estimate_object),
        headers: {
          Authorization: `Bearer ${LUNE_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      console.log("Calculate Emissions Fetch Response Object", response);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      estimate = await response.json();

      console.log(`Estimate for service ID ${service_id}`, estimate);
    }

    const shippingEmissions = {
      estimate_object_result: estimate_object ? estimate : null,
      method,
      price,
      service_id,
      service_name,
    };

    shippingResultsEmissions.push(shippingEmissions);
  }

  // Add rates Separately or Update rates with CO2 Offset amount
  upsertCO2ShippingRates(shippingResultsEmissions, attributesRequestPayload);

  //Save estimate ids with service IDs in the cart's attributes
  const cartAttributesURL = cart._links["fx:attributes"].href;
  const res = await foxyApi.fetch(cartAttributesURL, {
    body: JSON.stringify(attributesRequestPayload),
    method: "PATCH",
  });
  const data = await res.json();
  console.log("Cart attributes: ", data);
  console.log("shippingResultsEmissions", shippingResultsEmissions);
} catch (error) {
  console.log(error);
  rates.error(`${error}: ${error.stack}`);
}

/* --- Functions --- */
function upsertCO2ShippingRates(
  shippingResultsEmissions,
  attributesRequestPayload
) {
  shippingResultsEmissions.forEach((result, index) => {
    const {
      service_id,
      service_name,
      price,
      method,
      estimate_object_result,
    } = result;

    if (estimate_object_result) {
      const subscript = "&#x2082;";
      const { id, quote } = estimate_object_result;
      const CO2Kg = tonneToKg(quote.estimated_quantity);
      const CO2Gr = tonneToGram(quote.estimated_quantity);
      const CO2MassString =
        CO2Kg < 1
          ? `${CO2Gr} gCO${subscript} Compensated`
          : `${CO2Kg} kgCO${subscript} Compensated`;
      const compensatedCO2Price = (
        Number(price) + Number(quote.estimated_total_cost)
      ).toFixed(2);

      if (addOffsetRatesSeparately) {
        const serviceIdNewRate = 10001 + index;

        const serviceNameNewRate = `${service_name} (${CO2MassString})`;

        rates.add(
          serviceIdNewRate,
          compensatedCO2Price,
          method,
          serviceNameNewRate
        );
        // Add rate Ids and estimate ids as attributes to the cart
        const payload = { name: `rate_id_${serviceIdNewRate}`, value: id };
        attributesRequestPayload.push(payload);
      } else {
        const payload = { name: `rate_id_${service_id}`, value: id };
        const serviceName = `${service_name} (${CO2MassString})`;
        rates
          .filter(service_id)
          .price(compensatedCO2Price)
          .service(serviceName);

        attributesRequestPayload.push(payload);
      }
    }
  });
}

function buildEstimateObject(
  addressFrom,
  addressTo,
  totalWeight,
  transportationMethod
) {
  return {
    shipment: {
      mass: {
        amount: totalWeight,
        unit: "kg",
      },
    },
    route: {
      source: {
        street_line1: addressFrom.street,
        postcode: addressFrom.zip,
        city: addressFrom.city,
        country_code: addressFrom.country,
      },
      destination: {
        street_line1: addressTo.street1,
        postcode: addressTo.zip,
        city: addressTo.city,
        country_code: addressTo.country,
      },
    },
    method: transportationMethod,
  };
}

function getTransportationMethod(service_name) {
  const serviceName = service_name.trim().toLowerCase();

  //Setting service name keywords for checking if Air or Ground shipping / Could also be by ship or train
  const SERVICE_NAMES = {
    AIR: [
      "priority mail",
      "priority mail express",
      "first-class mail",
      "air",
      "freight",
      "express",
    ],
    GROUND: ["parcel select", "media mail", "ground", "home"],
    FREE: ["free"],
  };

  const VESSEL_TYPE = {
    PLANE: "plane",
    TRUCK: "truck_generic_van",
  };

  const isAirMethod = SERVICE_NAMES.AIR.some((keyTerm) =>
    serviceName.includes(keyTerm)
  );
  const isGroundMethod = SERVICE_NAMES.GROUND.some((keyTerm) =>
    serviceName.includes(keyTerm)
  );
  const isFreeShipping = SERVICE_NAMES.FREE.some((keyTerm) =>
    serviceName.includes(keyTerm)
  );

  if (isFreeShipping) return null;

  if (isGroundMethod && !isAirMethod) return VESSEL_TYPE.TRUCK;

  // If not ground, or if not sure default to plane
  return VESSEL_TYPE.PLANE;
}

function convertPoundsToKilograms(pounds) {
  const onePound = 0.453592;
  return (Number(pounds) * onePound).toFixed(3);
}

function tonneToKg(tonne) {
  const oneTonneInKg = 1000; // 1000 kg per tonne
  return (Number(tonne) * oneTonneInKg).toFixed(3);
}

function tonneToGram(tonne) {
  const oneTonneInGrams = 1000000; // 1000000 grams per tonne
  return Number(tonne) * oneTonneInGrams;
}

function getTotalWeightKg(totalWeight) {
  if (weightUnit === "lb") {
    return convertPoundsToKilograms(totalWeight).toString();
  }
  return totalWeight;
}

function countryCodeToISO3(country) {
  const iso3166_3 = {
    AF: "AFG",
    AX: "ALA",
    AL: "ALB",
    DZ: "DZA",
    AS: "ASM",
    AD: "AND",
    AO: "AGO",
    AI: "AIA",
    AQ: "ATA",
    AG: "ATG",
    AR: "ARG",
    AM: "ARM",
    AW: "ABW",
    AU: "AUS",
    AT: "AUT",
    AZ: "AZE",
    BS: "BHS",
    BH: "BHR",
    BD: "BGD",
    BB: "BRB",
    BY: "BLR",
    BE: "BEL",
    BZ: "BLZ",
    BJ: "BEN",
    BM: "BMU",
    BT: "BTN",
    BO: "BOL",
    BA: "BIH",
    BW: "BWA",
    BV: "BVT",
    BR: "BRA",
    VG: "VGB",
    IO: "IOT",
    BN: "BRN",
    BG: "BGR",
    BF: "BFA",
    BI: "BDI",
    KH: "KHM",
    CM: "CMR",
    CA: "CAN",
    CV: "CPV",
    KY: "CYM",
    CF: "CAF",
    TD: "TCD",
    CL: "CHL",
    CN: "CHN",
    HK: "HKG",
    MO: "MAC",
    CX: "CXR",
    CC: "CCK",
    CO: "COL",
    KM: "COM",
    CG: "COG",
    CD: "COD",
    CK: "COK",
    CR: "CRI",
    CI: "CIV",
    HR: "HRV",
    CU: "CUB",
    CY: "CYP",
    CZ: "CZE",
    DK: "DNK",
    DJ: "DJI",
    DM: "DMA",
    DO: "DOM",
    EC: "ECU",
    EG: "EGY",
    SV: "SLV",
    GQ: "GNQ",
    ER: "ERI",
    EE: "EST",
    ET: "ETH",
    FK: "FLK",
    FO: "FRO",
    FJ: "FJI",
    FI: "FIN",
    FR: "FRA",
    GF: "GUF",
    PF: "PYF",
    TF: "ATF",
    GA: "GAB",
    GM: "GMB",
    GE: "GEO",
    DE: "DEU",
    GH: "GHA",
    GI: "GIB",
    GR: "GRC",
    GL: "GRL",
    GD: "GRD",
    GP: "GLP",
    GU: "GUM",
    GT: "GTM",
    GG: "GGY",
    GN: "GIN",
    GW: "GNB",
    GY: "GUY",
    HT: "HTI",
    HM: "HMD",
    VA: "VAT",
    HN: "HND",
    HU: "HUN",
    IS: "ISL",
    IN: "IND",
    ID: "IDN",
    IR: "IRN",
    IQ: "IRQ",
    IE: "IRL",
    IM: "IMN",
    IL: "ISR",
    IT: "ITA",
    JM: "JAM",
    JP: "JPN",
    JE: "JEY",
    JO: "JOR",
    KZ: "KAZ",
    KE: "KEN",
    KI: "KIR",
    KP: "PRK",
    KR: "KOR",
    KW: "KWT",
    KG: "KGZ",
    LA: "LAO",
    LV: "LVA",
    LB: "LBN",
    LS: "LSO",
    LR: "LBR",
    LY: "LBY",
    LI: "LIE",
    LT: "LTU",
    LU: "LUX",
    MK: "MKD",
    MG: "MDG",
    MW: "MWI",
    MY: "MYS",
    MV: "MDV",
    ML: "MLI",
    MT: "MLT",
    MH: "MHL",
    MQ: "MTQ",
    MR: "MRT",
    MU: "MUS",
    YT: "MYT",
    MX: "MEX",
    FM: "FSM",
    MD: "MDA",
    MC: "MCO",
    MN: "MNG",
    ME: "MNE",
    MS: "MSR",
    MA: "MAR",
    MZ: "MOZ",
    MM: "MMR",
    NA: "NAM",
    NR: "NRU",
    NP: "NPL",
    NL: "NLD",
    AN: "ANT",
    NC: "NCL",
    NZ: "NZL",
    NI: "NIC",
    NE: "NER",
    NG: "NGA",
    NU: "NIU",
    NF: "NFK",
    MP: "MNP",
    NO: "NOR",
    OM: "OMN",
    PK: "PAK",
    PW: "PLW",
    PS: "PSE",
    PA: "PAN",
    PG: "PNG",
    PY: "PRY",
    PE: "PER",
    PH: "PHL",
    PN: "PCN",
    PL: "POL",
    PT: "PRT",
    PR: "PRI",
    QA: "QAT",
    RE: "REU",
    RO: "ROU",
    RU: "RUS",
    RW: "RWA",
    BL: "BLM",
    SH: "SHN",
    KN: "KNA",
    LC: "LCA",
    MF: "MAF",
    PM: "SPM",
    VC: "VCT",
    WS: "WSM",
    SM: "SMR",
    ST: "STP",
    SA: "SAU",
    SN: "SEN",
    RS: "SRB",
    SC: "SYC",
    SL: "SLE",
    SG: "SGP",
    SK: "SVK",
    SI: "SVN",
    SB: "SLB",
    SO: "SOM",
    ZA: "ZAF",
    GS: "SGS",
    SS: "SSD",
    ES: "ESP",
    LK: "LKA",
    SD: "SDN",
    SR: "SUR",
    SJ: "SJM",
    SZ: "SWZ",
    SE: "SWE",
    CH: "CHE",
    SY: "SYR",
    TW: "TWN",
    TJ: "TJK",
    TZ: "TZA",
    TH: "THA",
    TL: "TLS",
    TG: "TGO",
    TK: "TKL",
    TO: "TON",
    TT: "TTO",
    TN: "TUN",
    TR: "TUR",
    TM: "TKM",
    TC: "TCA",
    TV: "TUV",
    UG: "UGA",
    UA: "UKR",
    AE: "ARE",
    GB: "GBR",
    US: "USA",
    UM: "UMI",
    UY: "URY",
    UZ: "UZB",
    VU: "VUT",
    VE: "VEN",
    VN: "VNM",
    VI: "VIR",
    WF: "WLF",
    EH: "ESH",
    YE: "YEM",
    ZM: "ZMB",
    ZW: "ZWE",
    XK: "XKX",
  };

  return iso3166_3[country];
}
