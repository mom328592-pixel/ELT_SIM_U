const API_URL =
    import.meta.env.VITE_API_URL ||
    (
        import.meta.env.DEV
            ? "http://localhost:3000"
            : "https://eltsimu.onrender.com"
    );

// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================

async function refreshAccessToken() {
    const refreshToken =
        localStorage.getItem(
            "refresh_token"
        );

    if (!refreshToken) {
        return false;
    }

    try {
        const response =
            await fetch(
                `${API_URL}/auth/refresh`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify({
                            refresh_token:
                                refreshToken,
                        }),
                }
            );

        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );

        if (
            !response.ok
        ) {
            return false;
        }

        if (
            data?.data
                ?.access_token
        ) {
            localStorage.setItem(
                "access_token",
                data.data.access_token
            );

            if (
                data.data
                    .refresh_token
            ) {
                localStorage.setItem(
                    "refresh_token",
                    data.data.refresh_token
                );
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error(
            "REFRESH TOKEN ERROR:",
            error
        );

        return false;
    }
}

// ======================================================
// CREATE API ERROR
// ======================================================

function createApiError(
    message,
    status,
    data = {}
) {
    const error =
        new Error(
            message ||
                (
                    status === 403
                        ? "Access denied. You do not have permission for this action."
                        : status === 401
                        ? "Authentication required."
                        : "API request failed"
                )
        );

    error.status =
        status;

    error.code =
        data?.code;

    error.data =
        data;

    return error;
}

// ======================================================
// API FETCH
// ======================================================

export async function apiFetch(
    endpoint,
    options = {}
) {
    const {
        isPublic = false,
        headers = {},
        ...customOptions
    } = options;

    let token =
        localStorage.getItem(
            "access_token"
        );

    const isFormData =
        customOptions.body instanceof
        FormData;

    const reqHeaders = {
        ...(isFormData
            ? {}
            : {
                "Content-Type":
                    "application/json",
            }),

        ...headers,
    };

    if (
        !isPublic &&
        token
    ) {
        reqHeaders[
            "Authorization"
        ] =
            `Bearer ${token}`;
    }

    let response =
        await fetch(
            `${API_URL}${endpoint}`,
            {
                ...customOptions,
                headers:
                    reqHeaders,
            }
        );

    // ==================================================
    // 401
    // ==================================================

    if (
        response.status ===
            401 &&
        !isPublic
    ) {
        const refreshed =
            await refreshAccessToken();

        if (!refreshed) {
            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "refresh_token"
            );

            localStorage.removeItem(
                "user"
            );

            window.location.href =
                "/";

            throw createApiError(
                "Session expired. Please login again.",
                401
            );
        }

        token =
            localStorage.getItem(
                "access_token"
            );

        reqHeaders[
            "Authorization"
        ] =
            `Bearer ${token}`;

        response =
            await fetch(
                `${API_URL}${endpoint}`,
                {
                    ...customOptions,
                    headers:
                        reqHeaders,
                }
            );
    }

    const data =
        await response
            .json()
            .catch(
                () => ({})
            );

    if (
        !response.ok
    ) {
        throw createApiError(
            data?.message,
            response.status,
            data
        );
    }

    return data;
}