import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";
import { startMonitorCron } from "./jobs/monitor.job";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("MongoDB connected");
    startMonitorCron();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
