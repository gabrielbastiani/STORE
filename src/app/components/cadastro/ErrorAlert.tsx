import React from "react";

type Props = { message?: string | null };

const ErrorAlert: React.FC<Props> = ({ message }) => {
    if (!message) return null;
    return <div className="mb-4 text-red-600">{message}</div>;
};

export default ErrorAlert;