# plate-pool

A plate loading calculator for one home gym. It knows every plate, locking screw, collar and implement the owner has, and answers three questions: Load, List and Reverse.

```sh
npx plate-pool load barbell=173 dumbbells=40
npx plate-pool list barbell --from 100 --to 200
npx plate-pool reverse barbell --side 22.5,22.5,5,5
npx plate-pool inventory
```

Add `--json` for structured output. Run `npx plate-pool` with no command for every option.

The package bundles the owner's inventory file. Use `--inventory <path>` to read a different one. Source and specification: <https://github.com/joeuk89/plate-pool>.
