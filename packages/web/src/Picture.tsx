import type { Inventory, Loading } from "@plate-pool/core";
import { BarbellPicture } from "./BarbellPicture";
import { DumbbellPicture } from "./DumbbellPicture";
import { StackPicture } from "./StackPicture";
import { VestPicture } from "./VestPicture";
import type { Editing } from "./picture-parts";
import type { DrawOptions } from "./plate-stack";

interface Props extends DrawOptions {
  implement: string;
  loading: Loading;
  inventory: Inventory;
  editing?: Editing | undefined;
}

export function Picture({ implement, ...props }: Props) {
  switch (implement) {
    case "barbell":
      return <BarbellPicture {...props} />;
    case "dumbbell":
      return <DumbbellPicture {...props} />;
    case "kettlebell":
    case "leg":
      return <StackPicture implement={implement} {...props} />;
    case "vest":
      return <VestPicture loading={props.loading} inventory={props.inventory} editing={props.editing} />;
    default:
      return null;
  }
}
