declare module "*.geojson" {
  const value: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: {
        name: string;
        iso_a2: string;
        iso_a3: string;
      };
      geometry: GeoJSON.Geometry;
    }>;
  };
  export default value;
}
