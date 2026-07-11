import { z } from "zod";
import { EditComponent } from "./edit-component";

const schema = () => z.any().optional();
const label = "Timestamp actions";
const defaultValue = "";

export { label, schema, EditComponent, defaultValue };
