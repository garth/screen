defmodule ScreenWeb.PageControllerTest do
  use ScreenWeb.ConnCase

  test "GET / serves SPA when index.html exists", %{conn: conn} do
    conn = get(conn, ~p"/")
    response = html_response(conn, 200)
    assert response =~ "sveltekit"
  end

  describe "SPA catch-all" do
    test "returns 200 with index.html for SPA routes when build exists", %{conn: conn} do
      conn = get(conn, "/presentations")
      assert response(conn, 200) =~ "sveltekit"

      conn = get(conn, "/some/deep/route")
      assert response(conn, 200) =~ "sveltekit"
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
