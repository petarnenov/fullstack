import { ApiResponse } from "../../utils/typeExamples";

interface ApiResponseDisplayProps<T> {
  response: ApiResponse<T>;
  renderData: (data: T) => React.ReactNode;
}

export default function ApiResponseDisplay<T>({
  response,
  renderData,
}: ApiResponseDisplayProps<T>) {
  return (
    <div className="api-response">
      <div className="status">Status: {response.status}</div>
      {response.message && <div className="message">{response.message}</div>}
      <div className="data">{renderData(response.data)}</div>
    </div>
  );
}
