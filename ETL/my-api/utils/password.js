const validateStrongPassword = (
    password
) => {

    if (
        typeof password !==
        "string"
    ) {
        return false;
    }

    if (password.length < 8) {
        return false;
    }

    if (!/[A-Z]/.test(password)) {
        return false;
    }

    if (!/[a-z]/.test(password)) {
        return false;
    }

    if (!/[0-9]/.test(password)) {
        return false;
    }

    if (
        !/[^A-Za-z0-9]/.test(password)
    ) {
        return false;
    }

    return true;
};
if (!validateStrongPassword(password)) {

    return res.status(400).json({
        success: false,
        message:
            "Password must contain at least 8 characters, uppercase, lowercase, number and special character"
    });

}