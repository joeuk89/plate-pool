import type { Inventory, Loading } from "@plate-pool/core";
import { BarPicture } from "./BarPicture";
import { HandlePicture } from "./HandlePicture";
import { kindOf } from "./kit";
import type { Editing } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";
import { StackPicture } from "./StackPicture";
import { VestPicture } from "./VestPicture";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function Picture(props: Props) {
  switch (kindOf(props.inventory, props.implement)) {
    case "bar":
      return <BarPicture {...props} />;
    case "handle":
      return <HandlePicture {...props} />;
    case "stack":
      return <StackPicture {...props} />;
    case "vest":
      return <VestPicture implement={props.implement} loading={props.loading} inventory={props.inventory} editing={props.editing} />;
    default:
      return null;
  }
}
