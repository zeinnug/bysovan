// Common colors
export const COLORS = {
  jet: '#292929',
  davysGray: '#585757',
  linen: '#F5ECE4',
  pumpkin: '#FC6A0A',
  goldenGate: '#E74504',
  white: '#FFFFFF',
  success: '#32CD32',
};

// Common shadow style untuk card
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
};

// Format currency ke Rupiah
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Get Axios config dengan token
export const getAxiosConfig = async (getAuthToken) => {
  const token = await getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// Handle response data produk dari berbagai format API
export const extractProductData = (responseData) => {
  if (responseData.products && Array.isArray(responseData.products)) {
    return responseData.products;
  }
  if (responseData.data?.products && Array.isArray(responseData.data.products)) {
    return responseData.data.products;
  }
  if (Array.isArray(responseData)) {
    return responseData;
  }
  return [];
};
