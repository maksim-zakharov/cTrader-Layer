/**
 * Минимальные типы для protobufjs@5 (в пакете нет @types).
 */
declare module "protobufjs" {
    interface ProtobufJsApi {
        /** Загружает .proto файл в builder */
        loadProtoFile: (file: string, builder?: unknown) => unknown;
    }

    const protobuf: ProtobufJsApi;
    export default protobuf;
    export = protobuf;
}
