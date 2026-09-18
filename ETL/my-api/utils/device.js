const getClientIp = (req) => {
    const forwarded =
        req.headers["x-forwarded-for"];

    if (forwarded) {
        return forwarded
            .split(",")[0]
            .trim();
    }

    return (
        req.socket?.remoteAddress ||
        req.ip ||
        null
    );
};


const getDeviceName = (userAgent) => {
    if (!userAgent) {
        return "Unknown Device";
    }

    let browser = "Browser";
    let os = "Unknown OS";

    // Browser
    if (userAgent.includes("Edg/")) {
        browser = "Microsoft Edge";
    } else if (
        userAgent.includes("Chrome/")
    ) {
        browser = "Chrome";
    } else if (
        userAgent.includes("Firefox/")
    ) {
        browser = "Firefox";
    } else if (
        userAgent.includes("Safari/")
    ) {
        browser = "Safari";
    }

    // OS
    if (userAgent.includes("Windows NT")) {
        os = "Windows";
    } else if (
        userAgent.includes("Mac OS X")
    ) {
        os = "macOS";
    } else if (
        userAgent.includes("Android")
    ) {
        os = "Android";
    } else if (
        userAgent.includes("iPhone")
    ) {
        os = "iPhone";
    } else if (
        userAgent.includes("Linux")
    ) {
        os = "Linux";
    }

    return `${browser} • ${os}`;
};


module.exports = {
    getClientIp,
    getDeviceName
};