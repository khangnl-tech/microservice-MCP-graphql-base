# Microservice MCP GraphQL Base

Dự án này được xây dựng theo mô hình microservices, kết hợp GraphQL ở cả tầng Gateway và tại các microservice (đơn cử như microservice AI). Đồng thời, dự án hỗ trợ [MCP (Model Context Protocol)](https://github.com/modelcontextprotocol) – cho phép giao tiếp với các service hoặc tool bên ngoài, đặc biệt là các tích hợp AI/ML và các tác vụ phức tạp.

## Tổng quan Kiến trúc

1. **Gateway (GraphQL)**  
   - Xây dựng bằng Node.js + Express + Apollo Server, đóng vai trò cầu nối (gateway) giữa client và các microservice.  
   - Định nghĩa schema GraphQL tổng hợp, implement resolvers gọi sang microservices.  
   - Có thể dùng Apollo Federation hoặc schema stitching để liên kết microservice khác, hoặc thủ công gọi REST/gRPC.  

2. **Các Microservices**  
   - **AI**  
     - Chạy GraphQL server nội bộ (trong ví dụ: query “aiHello”), sẵn sàng mở rộng sang các API AI.  
     - Mục tiêu: Tích hợp AI model (OpenAI, Google AI, HuggingFace...), expose các hàm inference.  
   - **Media**  
     - Xử lý PDF, ảnh, video (pdf-parse, sharp, jimp, fluent-ffmpeg), hiện đang chạy REST.  
     - Hoàn toàn có thể thêm Apollo Server để cung cấp GraphQL interface nếu cần.  
   - **Auth**  
     - Chịu trách nhiệm xác thực (JWT, bcrypt, helmet, cors...), đang chạy REST.  
     - Có thể cung cấp GraphQL resolvers cho logic user, sessions, roles, v.v.  
   - **Data**  
     - Quản lý data layer (MongoDB, Redis, Qdrant), real-time (Socket.IO), đang chạy REST.  
     - Có thể chuyển sang GraphQL server tùy yêu cầu kinh doanh.  

3. **MCP (Model Context Protocol)**  
   - Trong dự án này, MCP cho phép đăng ký service (microservice AI, Auth, v.v.) như một “MCP server”.  
   - Khi cần gọi logic, thay vì gọi REST, ta có thể dùng `use_mcp_tool` (hoặc `access_mcp_resource`) từ Gateway/microservice khác đến AI microservice.  
   - MCP giảm coupling, cho phép code “call tool” thay vì import library hoặc cứng code.  

4. **Cách thức hoạt động với GraphQL**  
   1. **Gateway**:  
      - Sử dụng Apollo Server, có thể định nghĩa typeDefs/resolvers.  
      - Tại các resolver, dùng HTTP fetch hoặc MCP call sang microservice AI, Auth, v.v. để lấy dữ liệu. Kết quả trả về cho client dưới dạng GraphQL response.  
   2. **Microservice AI** (đã minh họa):  
      - Dùng Apollo Server cục bộ.  
      - Thêm schema, resolvers đảm nhiệm trả lời query AI.  
      - Lợi ích: microservice AI vẫn có cổng /graphql riêng (port 5001).  
      - Gateway có thể gọi sang AI microservice qua REST, gRPC, hoặc cũng có thể chaining GraphQL nếu muốn.  
   3. **Các microservice khác (Media, Auth, Data)**  
      - Có thể nâng cấp lên Apollo Server tương tự.  
      - Hoặc giữ REST, tùy nhu cầu. Gateway vẫn gom request và trả về GraphQL cho client.

5. **Code Development cho API**  
   - **Gateway**:  
     - Tạo `typeDefs` + `resolvers`, ví dụ:
       ```js
       const { ApolloServer, gql } = require('apollo-server-express');
       const typeDefs = gql`
         type Query {
           hello: String
           aiHello: String
         }
       `;
       const resolvers = {
         Query: {
           hello: () => 'Hello from Gateway!',
           aiHello: async () => {
             // gọi sang microservice AI: /graphql => query { aiHello }
             // parse JSON => return
           }
         }
       };
       ```
   - **Microservice AI**:  
     - Như file `microservices/ai/src/index.js` đã minh họa, cài `apollo-server-express`, triển khai schema GraphQL.  
   - **Các microservice khác**:  
     - Hoặc dùng REST, hoặc tương tự AI, thêm ApolloServer.  

6. **Cách khởi chạy**  
   1. **Cài đặt**  
      ```bash
      npm install
      cd gateway && npm install
      cd ../microservices/ai && npm install
      cd ../media && npm install
      cd ../auth && npm install
      cd ../data && npm install
      ```
   2. **Chạy Docker Compose** (nếu muốn dùng Docker)  
      ```bash
      docker compose up --build
      ```
      - Gateway sẽ chạy cổng 4000, AI trên 5001, Media trên 5002, Auth trên 5003, Data trên 5004.
   3. **Truy cập**  
      - Gateway GraphQL: http://localhost:4000/graphql  
      - AI GraphQL: http://localhost:5001/graphql  
      - Các service khác: tùy theo endpoints.  

7. **Kiến trúc MCP**  
   - Cấu trúc code có thể bổ sung 1 “server MCP” trong AI, cho phép `tool` như “callOpenAI”, “analyzeImage”…  
   - Gateway/microservice khác gọi `use_mcp_tool` => AI microservice thực thi.  
   - Mục tiêu: thay vì `import openai from 'openai'` ở mọi chỗ, gateway gọi MCP – “openaiTool” do AI microservice cung cấp.  
   - Giảm việc cài SDK, lock version, tách logic AI ra một chỗ.  

8. **Triển khai Production**  
   - Sử dụng Kubernetes, Docker Swarm, ECS.  
   - Triển khai Logging (winston, pino…), Monitoring (Prometheus, Grafana…).  
   - Áp dụng AAA (Authentication, Authorization, Auditing).  

## Kết luận

- Cấu trúc microservices + GraphQL + MCP cho phép bạn phát triển linh hoạt, tách biệt logic AI, media, auth, data.  
- Gateway GraphQL tập trung, giúp client chỉ cần endpoint duy nhất.  
- Mỗi microservice có thể phát triển độc lập, ngôn ngữ tùy chọn, miễn đáp ứng giao thức giao tiếp (REST, GraphQL, hoặc MCP).  
- Đây là nền tảng mạnh mẽ cho dự án lớn, đặc biệt khi AI/ML và media processing phức tạp.

Chúc bạn thành công với dự án microservice GraphQL, sẵn sàng tích hợp các tính năng AI, media, auth, data, và nhiều hơn nữa!
