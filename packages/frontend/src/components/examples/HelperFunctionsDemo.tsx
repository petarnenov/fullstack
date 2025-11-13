import {
  formatCurrency,
  formatDate,
  isValidEmail,
  generateId,
  User,
  deepClone,
} from "../../utils/typeExamples";

interface HelperFunctionsDemoProps {
  exampleUser: User;
  groupedUsers: Record<string, User[]>;
}

export default function HelperFunctionsDemo({
  exampleUser,
  groupedUsers,
}: HelperFunctionsDemoProps) {
  const clonedUser = deepClone(exampleUser);

  const handleEmailValidation = (email: string) => {
    return isValidEmail(email) ? "Valid email" : "Invalid email";
  };

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <strong>formatCurrency:</strong> {formatCurrency(1234.56)} |{" "}
        {formatCurrency(9999.99, "EUR")}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>formatDate:</strong> {formatDate(new Date(), "short")} |{" "}
        {formatDate(new Date(), "long")} | {formatDate(new Date(), "full")}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>isValidEmail:</strong>{" "}
        {handleEmailValidation("test@example.com")} |{" "}
        {handleEmailValidation("invalid-email")}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>generateId:</strong> {generateId("example")}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>deepClone:</strong> User cloned ={" "}
        {clonedUser.id === exampleUser.id ? "same ID" : "different ID"} (
        {clonedUser === exampleUser ? "same reference" : "different reference"})
      </div>

      <div>
        <strong>groupBy:</strong>
        <pre
          style={{
            background: "#f5f5f5",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(groupedUsers, null, 2)}
        </pre>
      </div>
    </>
  );
}
