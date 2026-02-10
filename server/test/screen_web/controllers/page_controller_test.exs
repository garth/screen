defmodule ScreenWeb.PageControllerTest do
  use ScreenWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "Peace of mind from prototype to production"
  end

  describe "SPA catch-all" do
    test "returns 200 with index.html for SPA routes when build exists", %{conn: conn} do
      # Create a temporary index.html in priv/static for the test
      static_dir = Path.join(:code.priv_dir(:screen), "static")
      index_path = Path.join(static_dir, "index.html")
      File.mkdir_p!(static_dir)

      had_file = File.exists?(index_path)
      unless had_file, do: File.write!(index_path, "<html><body>SPA</body></html>")

      try do
        conn = get(conn, "/presentations")
        assert response(conn, 200) =~ "SPA"

        conn = get(conn, "/some/deep/route")
        assert response(conn, 200) =~ "SPA"
      after
        unless had_file, do: File.rm(index_path)
      end
    end

    test "returns 404 when index.html does not exist", %{conn: conn} do
      # Ensure no index.html exists
      index_path = Path.join(:code.priv_dir(:screen), "static/index.html")

      if File.exists?(index_path) do
        original = File.read!(index_path)
        File.rm!(index_path)

        try do
          conn = get(conn, "/nonexistent-spa-route")
          assert response(conn, 404)
        after
          File.write!(index_path, original)
        end
      else
        conn = get(conn, "/nonexistent-spa-route")
        assert response(conn, 404)
      end
    end
  end
end
