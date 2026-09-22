const API_URL = " https://eltsimu.onrender.com";

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return false;
    }

    if (data?.data?.access_token) {
      localStorage.setItem("access_token", data.data.access_token);

      if (data.data.refresh_token) {
        localStorage.setItem("refresh_token", data.data.refresh_token);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);
    return false;
  }
}

export async function apiFetch(endpoint, options = {}) {
  // ແຍກ isPublic ອອກຈາກ options ເພື່ອບໍ່ໃຫ້ຫຼຸດໄປໃສ່ fetch options
  const { isPublic = false, headers = {}, ...customOptions } = options;

  let token = localStorage.getItem("access_token");

  // ກຽມ Headers
  const isFormData = customOptions.body instanceof FormData;
  const reqHeaders = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  // ສົ່ງ Authorization header เฉพาะເວລາທີ່ບໍ່ແມ່ນ Public request ແລະ ມີ Token
  if (!isPublic && token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...customOptions,
    headers: reqHeaders,
  });

  // ຖ້າເປັນ 401 (Unauthorized)
  if (response.status === 401) {
    // ຖ້າເປັນ Public Request ແຕ່ໄດ້ 401 (ເຊັ່ນ: Backend ຕອບກັບ 401 ເອງ) ໃຫ້ຂ້າມການ Refresh / Logout
    if (isPublic) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Unauthorized Request");
    }

    // ຖ້າເປັນ Protected Request ໃຫ້ພະຍາຍາມ Refresh Token
    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      window.location.href = "/";

      throw new Error("Session expired. Please login again.");
    }

    // ຫຼັງຈາກ Refresh Token ສຳເລັດ ໃຫ້ເອີ້ນ API ໃໝ່ອີກຄັ້ງ
    token = localStorage.getItem("access_token");
    reqHeaders["Authorization"] = `Bearer ${token}`;

    response = await fetch(`${API_URL}${endpoint}`, {
      ...customOptions,
      headers: reqHeaders,
    });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}